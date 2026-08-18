const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/planning?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });
  res.json(db.prepare('SELECT * FROM planning_taches WHERE projet_id = ? ORDER BY date_debut').all(projet_id));
});

// POST /api/planning
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { projet_id, contrat_ligne_id, designation, date_debut, date_fin, valeur_planifiee } = req.body;
  if (!projet_id || !designation) return res.status(400).json({ error: 'projet_id et designation requis' });

  const info = db.prepare(`
    INSERT INTO planning_taches (projet_id, contrat_ligne_id, designation, date_debut, date_fin, valeur_planifiee)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projet_id, contrat_ligne_id || null, designation, date_debut || null, date_fin || null, valeur_planifiee || 0);

  res.status(201).json(db.prepare('SELECT * FROM planning_taches WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/planning/:id - mise a jour de l'avancement et de la valeur realisee
router.put('/:id', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const fields = ['designation', 'date_debut', 'date_fin', 'avancement_pct', 'valeur_planifiee', 'valeur_realisee', 'statut'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  const result = db.prepare(`UPDATE planning_taches SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Tache introuvable' });

  res.json(db.prepare('SELECT * FROM planning_taches WHERE id = ?').get(req.params.id));
});

module.exports = router;
