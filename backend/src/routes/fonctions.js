const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/fonctions
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM fonctions ORDER BY nom').all());
});

// POST /api/fonctions
router.post('/', requireRole('admin', 'direction'), (req, res) => {
  const { nom, taux_horaire } = req.body;
  if (!nom || taux_horaire === undefined) return res.status(400).json({ error: 'nom et taux_horaire requis' });

  try {
    const info = db.prepare('INSERT INTO fonctions (nom, taux_horaire) VALUES (?, ?)').run(nom, taux_horaire);
    res.status(201).json(db.prepare('SELECT * FROM fonctions WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Cette fonction existe deja' });
    throw err;
  }
});

// PUT /api/fonctions/:id
router.put('/:id', requireRole('admin', 'direction'), (req, res) => {
  const fields = ['nom', 'taux_horaire'];
  const updates = fields.filter((f) => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map((f) => `${f} = ?`).join(', ');
  const values = updates.map((f) => req.body[f]);
  const result = db.prepare(`UPDATE fonctions SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Fonction introuvable' });

  res.json(db.prepare('SELECT * FROM fonctions WHERE id = ?').get(req.params.id));
});

module.exports = router;
