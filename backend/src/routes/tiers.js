const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/tiers?type=fournisseur|sous_traitant
router.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare("SELECT * FROM tiers WHERE type = ? OR type = 'les_deux' ORDER BY nom").all(type)
    : db.prepare('SELECT * FROM tiers ORDER BY nom').all();
  res.json(rows);
});

// GET /api/tiers/:id
router.get('/:id', (req, res) => {
  const tier = db.prepare('SELECT * FROM tiers WHERE id = ?').get(req.params.id);
  if (!tier) return res.status(404).json({ error: 'Tiers introuvable' });
  res.json(tier);
});

// POST /api/tiers
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { nom, type, contact_nom, telephone, email, adresse, rib, ice, notes } = req.body;
  if (!nom || !type) return res.status(400).json({ error: 'nom et type requis' });

  const info = db.prepare(`
    INSERT INTO tiers (nom, type, contact_nom, telephone, email, adresse, rib, ice, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nom, type, contact_nom || null, telephone || null, email || null, adresse || null, rib || null, ice || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM tiers WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/tiers/:id
router.put('/:id', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const fields = ['nom', 'type', 'contact_nom', 'telephone', 'email', 'adresse', 'rib', 'ice', 'notes'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  const result = db.prepare(`UPDATE tiers SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Tiers introuvable' });

  res.json(db.prepare('SELECT * FROM tiers WHERE id = ?').get(req.params.id));
});

module.exports = router;
