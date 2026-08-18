const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM decomptes_sous_traitant').get().c + 1;
  return `DST-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/decomptes-sous-traitant?contrat_id=
router.get('/', (req, res) => {
  const { contrat_id } = req.query;
  let query = `SELECT d.*, s.numero AS situation_numero, s.contrat_id FROM decomptes_sous_traitant d JOIN situations_travaux s ON s.id = d.situation_id`;
  const params = [];
  if (contrat_id) { query += ' WHERE s.contrat_id = ?'; params.push(contrat_id); }
  query += ' ORDER BY d.date_creation DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/decomptes-sous-traitant/:id
router.get('/:id', (req, res) => {
  const dec = db.prepare('SELECT * FROM decomptes_sous_traitant WHERE id = ?').get(req.params.id);
  if (!dec) return res.status(404).json({ error: 'Decompte introuvable' });
  res.json(dec);
});

// POST /api/decomptes-sous-traitant - genere depuis une situation validee
router.post('/', requireRole('admin', 'chef_projet', 'comptable'), (req, res) => {
  const { situation_id } = req.body;
  if (!situation_id) return res.status(400).json({ error: 'situation_id requis' });

  const situation = db.prepare('SELECT * FROM situations_travaux WHERE id = ?').get(situation_id);
  if (!situation) return res.status(404).json({ error: 'Situation introuvable' });
  if (situation.statut !== 'validee' && situation.statut !== 'payee') {
    return res.status(400).json({ error: 'La situation doit etre validee avant de generer un decompte' });
  }

  const dejaGenere = db.prepare('SELECT id FROM decomptes_sous_traitant WHERE situation_id = ?').get(situation_id);
  if (dejaGenere) return res.status(400).json({ error: 'Un decompte existe deja pour cette situation' });

  const contrat = db.prepare('SELECT * FROM contrats_sous_traitance WHERE id = ?').get(situation.contrat_id);
  const montantBrut = situation.montant;
  const montantRetenues = montantBrut * ((contrat.taux_retenue_garantie || 0) / 100);
  const netAPayer = montantBrut - montantRetenues;

  const reference = genRef();
  const info = db.prepare(`
    INSERT INTO decomptes_sous_traitant (reference, situation_id, montant_brut, montant_retenues, net_a_payer)
    VALUES (?, ?, ?, ?, ?)
  `).run(reference, situation_id, montantBrut, montantRetenues, netAPayer);

  res.status(201).json(db.prepare('SELECT * FROM decomptes_sous_traitant WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/decomptes-sous-traitant/:id/valider
router.put('/:id/valider', requireRole('admin', 'chef_projet', 'comptable'), (req, res) => {
  const result = db.prepare("UPDATE decomptes_sous_traitant SET statut = 'valide' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);
  if (result.changes === 0) return res.status(400).json({ error: 'Decompte introuvable ou deja valide' });
  res.json(db.prepare('SELECT * FROM decomptes_sous_traitant WHERE id = ?').get(req.params.id));
});

module.exports = router;
