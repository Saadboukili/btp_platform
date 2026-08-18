const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM factures_vente').get().c + 1;
  return `FV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/factures-vente?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  const rows = projet_id
    ? db.prepare('SELECT * FROM factures_vente WHERE projet_id = ? ORDER BY date_facture DESC').all(projet_id)
    : db.prepare(`SELECT f.*, p.nom AS projet_nom FROM factures_vente f JOIN projets p ON p.id = f.projet_id ORDER BY f.date_facture DESC`).all();
  res.json(rows);
});

// GET /api/factures-vente/:id
router.get('/:id', (req, res) => {
  const f = db.prepare('SELECT * FROM factures_vente WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Facture introuvable' });
  res.json(f);
});

// POST /api/factures-vente - facturation depuis un decompte valide
router.post('/', requireRole('admin', 'comptable'), (req, res) => {
  const { decompte_id, date_echeance } = req.body;
  if (!decompte_id) return res.status(400).json({ error: 'decompte_id requis' });

  const decompte = db.prepare('SELECT * FROM decomptes WHERE id = ?').get(decompte_id);
  if (!decompte) return res.status(404).json({ error: 'Decompte introuvable' });
  if (decompte.statut !== 'valide') return res.status(400).json({ error: 'Le decompte doit etre valide avant facturation' });

  const dejaFacture = db.prepare('SELECT id FROM factures_vente WHERE decompte_id = ?').get(decompte_id);
  if (dejaFacture) return res.status(400).json({ error: 'Ce decompte a deja ete facture' });

  const attachement = db.prepare('SELECT a.* FROM decomptes d JOIN attachements a ON a.id = d.attachement_id WHERE d.id = ?').get(decompte_id);
  const contrat = db.prepare('SELECT * FROM contrats WHERE id = ?').get(attachement.contrat_id);

  const reference = genRef();
  const info = db.prepare(`
    INSERT INTO factures_vente (reference, decompte_id, projet_id, montant, date_echeance)
    VALUES (?, ?, ?, ?, ?)
  `).run(reference, decompte_id, contrat.projet_id, decompte.net_a_payer, date_echeance || null);

  db.prepare("UPDATE decomptes SET statut = 'facture' WHERE id = ?").run(decompte_id);

  res.status(201).json(db.prepare('SELECT * FROM factures_vente WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/factures-vente/:id/reglement - enregistrement d'un paiement (partiel ou total)
router.put('/:id/reglement', requireRole('admin', 'comptable'), (req, res) => {
  const { montant } = req.body;
  if (!montant || montant <= 0) return res.status(400).json({ error: 'montant de reglement invalide' });

  const facture = db.prepare('SELECT * FROM factures_vente WHERE id = ?').get(req.params.id);
  if (!facture) return res.status(404).json({ error: 'Facture introuvable' });

  const nouveauMontantRegle = facture.montant_regle + montant;
  const statut = nouveauMontantRegle >= facture.montant ? 'reglee' : 'partiellement_reglee';

  db.prepare('UPDATE factures_vente SET montant_regle = ?, statut = ? WHERE id = ?').run(nouveauMontantRegle, statut, req.params.id);
  res.json(db.prepare('SELECT * FROM factures_vente WHERE id = ?').get(req.params.id));
});

module.exports = router;
