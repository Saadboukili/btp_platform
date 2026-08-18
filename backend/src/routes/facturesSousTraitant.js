const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM factures_sous_traitant').get().c + 1;
  return `FST-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/factures-sous-traitant?contrat_id=
router.get('/', (req, res) => {
  const { contrat_id } = req.query;
  const rows = contrat_id
    ? db.prepare('SELECT * FROM factures_sous_traitant WHERE contrat_id = ? ORDER BY date_facture DESC').all(contrat_id)
    : db.prepare(`
        SELECT f.*, t.nom AS sous_traitant_nom FROM factures_sous_traitant f
        JOIN contrats_sous_traitance c ON c.id = f.contrat_id JOIN tiers t ON t.id = c.sous_traitant_id
        ORDER BY f.date_facture DESC
      `).all();
  res.json(rows);
});

// POST /api/factures-sous-traitant - depuis un decompte valide
router.post('/', requireRole('admin', 'chef_projet', 'comptable'), (req, res) => {
  const { decompte_id } = req.body;
  if (!decompte_id) return res.status(400).json({ error: 'decompte_id requis' });

  const decompte = db.prepare('SELECT * FROM decomptes_sous_traitant WHERE id = ?').get(decompte_id);
  if (!decompte) return res.status(404).json({ error: 'Decompte introuvable' });
  if (decompte.statut !== 'valide') return res.status(400).json({ error: 'Le decompte doit etre valide avant facturation' });

  const dejaFacture = db.prepare('SELECT id FROM factures_sous_traitant WHERE decompte_id = ?').get(decompte_id);
  if (dejaFacture) return res.status(400).json({ error: 'Ce decompte a deja ete facture' });

  const situation = db.prepare('SELECT * FROM situations_travaux WHERE id = ?').get(decompte.situation_id);

  const reference = genRef();
  const info = db.prepare(`
    INSERT INTO factures_sous_traitant (reference, decompte_id, contrat_id, montant)
    VALUES (?, ?, ?, ?)
  `).run(reference, decompte_id, situation.contrat_id, decompte.net_a_payer);

  db.prepare("UPDATE decomptes_sous_traitant SET statut = 'facture' WHERE id = ?").run(decompte_id);
  db.prepare("UPDATE situations_travaux SET statut = 'payee' WHERE id = ?").run(situation.id);

  res.status(201).json(db.prepare('SELECT * FROM factures_sous_traitant WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/factures-sous-traitant/:id/reglement
router.put('/:id/reglement', requireRole('admin', 'comptable'), (req, res) => {
  const { montant } = req.body;
  if (!montant || montant <= 0) return res.status(400).json({ error: 'montant de reglement invalide' });

  const facture = db.prepare('SELECT * FROM factures_sous_traitant WHERE id = ?').get(req.params.id);
  if (!facture) return res.status(404).json({ error: 'Facture introuvable' });

  const nouveauMontantRegle = facture.montant_regle + montant;
  const statut = nouveauMontantRegle >= facture.montant ? 'reglee' : 'partiellement_reglee';

  db.prepare('UPDATE factures_sous_traitant SET montant_regle = ?, statut = ? WHERE id = ?').run(nouveauMontantRegle, statut, req.params.id);
  res.json(db.prepare('SELECT * FROM factures_sous_traitant WHERE id = ?').get(req.params.id));
});

module.exports = router;
