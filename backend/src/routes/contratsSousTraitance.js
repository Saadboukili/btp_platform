const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genererReference() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM contrats_sous_traitance').get().c + 1;
  return `CST-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/contrats-sous-traitance?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  const rows = projet_id
    ? db.prepare(`SELECT c.*, t.nom AS sous_traitant_nom FROM contrats_sous_traitance c LEFT JOIN tiers t ON t.id = c.sous_traitant_id WHERE c.projet_id = ?`).all(projet_id)
    : db.prepare(`SELECT c.*, t.nom AS sous_traitant_nom, p.nom AS projet_nom FROM contrats_sous_traitance c LEFT JOIN tiers t ON t.id = c.sous_traitant_id LEFT JOIN projets p ON p.id = c.projet_id`).all();
  res.json(rows);
});

// GET /api/contrats-sous-traitance/:id
router.get('/:id', (req, res) => {
  const contrat = db.prepare('SELECT * FROM contrats_sous_traitance WHERE id = ?').get(req.params.id);
  if (!contrat) return res.status(404).json({ error: 'Contrat introuvable' });

  contrat.situations = db.prepare('SELECT * FROM situations_travaux WHERE contrat_id = ? ORDER BY numero').all(req.params.id);
  const montantPaye = contrat.situations.filter(s => s.statut === 'payee').reduce((sum, s) => sum + s.montant, 0);
  const retenue = montantPaye * (contrat.taux_retenue_garantie / 100);
  contrat.montant_paye = montantPaye;
  contrat.retenue_garantie = retenue;
  contrat.solde_restant = contrat.montant_total - montantPaye;

  res.json(contrat);
});

// POST /api/contrats-sous-traitance
router.post('/', requireRole('admin', 'chef_projet'), (req, res) => {
  const { projet_id, sous_traitant_id, nature_travaux, montant_total, taux_retenue_garantie, date_signature, notes, chiffrage_poste_id } = req.body;
  if (!projet_id || !sous_traitant_id || !montant_total) {
    return res.status(400).json({ error: 'projet_id, sous_traitant_id et montant_total requis' });
  }

  const reference = genererReference();
  const info = db.prepare(`
    INSERT INTO contrats_sous_traitance (reference, projet_id, sous_traitant_id, nature_travaux, montant_total, taux_retenue_garantie, date_signature, notes, chiffrage_poste_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference, projet_id, sous_traitant_id, nature_travaux || null, montant_total, taux_retenue_garantie || 0, date_signature || null, notes || null, chiffrage_poste_id || null);

  res.status(201).json(db.prepare('SELECT * FROM contrats_sous_traitance WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/contrats-sous-traitance/:id
router.put('/:id', requireRole('admin', 'chef_projet'), (req, res) => {
  const fields = ['nature_travaux', 'montant_total', 'taux_retenue_garantie', 'statut', 'date_signature', 'notes', 'chiffrage_poste_id'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  db.prepare(`UPDATE contrats_sous_traitance SET ${setClause} WHERE id = ?`).run(...values, req.params.id);

  res.json(db.prepare('SELECT * FROM contrats_sous_traitance WHERE id = ?').get(req.params.id));
});

// POST /api/contrats-sous-traitance/:id/situations
router.post('/:id/situations', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { pourcentage_avancement, montant } = req.body;
  const lastNum = db.prepare('SELECT MAX(numero) AS n FROM situations_travaux WHERE contrat_id = ?').get(req.params.id);
  const numero = (lastNum.n || 0) + 1;

  const info = db.prepare(`
    INSERT INTO situations_travaux (contrat_id, numero, pourcentage_avancement, montant)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, numero, pourcentage_avancement || 0, montant || 0);

  res.status(201).json(db.prepare('SELECT * FROM situations_travaux WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/contrats-sous-traitance/situations/:situationId - valider/payer
router.put('/situations/:situationId', requireRole('admin', 'chef_projet', 'comptable'), (req, res) => {
  const { statut } = req.body;
  db.prepare('UPDATE situations_travaux SET statut = ? WHERE id = ?').run(statut, req.params.situationId);
  res.json(db.prepare('SELECT * FROM situations_travaux WHERE id = ?').get(req.params.situationId));
});

module.exports = router;
