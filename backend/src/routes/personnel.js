const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/personnel?actif=1
router.get('/', (req, res) => {
  const { actif } = req.query;
  let query = `SELECT p.*, f.nom AS fonction_nom, f.taux_horaire FROM personnel p LEFT JOIN fonctions f ON f.id = p.fonction_id`;
  const params = [];
  if (actif !== undefined) { query += ' WHERE p.actif = ?'; params.push(actif === '1' ? 1 : 0); }
  query += ' ORDER BY p.nom';
  res.json(db.prepare(query).all(...params));
});

// GET /api/personnel/:id
router.get('/:id', (req, res) => {
  const p = db.prepare(`SELECT p.*, f.nom AS fonction_nom, f.taux_horaire FROM personnel p LEFT JOIN fonctions f ON f.id = p.fonction_id WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Personnel introuvable' });
  res.json(p);
});

// POST /api/personnel
router.post('/', requireRole('admin', 'direction'), (req, res) => {
  const { nom, cin, telephone, fonction_id, date_embauche, notes } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });

  const info = db.prepare(`
    INSERT INTO personnel (nom, cin, telephone, fonction_id, date_embauche, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nom, cin || null, telephone || null, fonction_id || null, date_embauche || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM personnel WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/personnel/:id
router.put('/:id', requireRole('admin', 'direction'), (req, res) => {
  const fields = ['nom', 'cin', 'telephone', 'fonction_id', 'date_embauche', 'actif', 'notes'];
  const updates = fields.filter((f) => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map((f) => `${f} = ?`).join(', ');
  const values = updates.map((f) => req.body[f]);
  const result = db.prepare(`UPDATE personnel SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Personnel introuvable' });

  res.json(db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id));
});

module.exports = router;
