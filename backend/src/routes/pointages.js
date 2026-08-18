const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const MAJORATION_HEURES_SUP = 1.25; // majoration standard appliquee aux heures supplementaires

// GET /api/pointages/synthese?projet_id=&date_debut=&date_fin= - cout main d'oeuvre par personnel
// IMPORTANT: definie AVANT /:id pour eviter que "synthese" soit interprete comme un id
router.get('/synthese', (req, res) => {
  const { projet_id, date_debut, date_fin } = req.query;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });

  let query = `
    SELECT pt.personnel_id, p.nom AS personnel_nom, f.nom AS fonction_nom, f.taux_horaire,
      SUM(pt.heures_normales) AS total_heures_normales,
      SUM(pt.heures_supplementaires) AS total_heures_supplementaires,
      SUM(CASE WHEN pt.type = 'absence' THEN 1 ELSE 0 END) AS jours_absence,
      SUM(CASE WHEN pt.type = 'conge' THEN 1 ELSE 0 END) AS jours_conge
    FROM pointages pt JOIN personnel p ON p.id = pt.personnel_id LEFT JOIN fonctions f ON f.id = p.fonction_id
    WHERE pt.projet_id = ?
  `;
  const params = [projet_id];
  if (date_debut) { query += ' AND pt.date_pointage >= ?'; params.push(date_debut); }
  if (date_fin) { query += ' AND pt.date_pointage <= ?'; params.push(date_fin); }
  query += ' GROUP BY pt.personnel_id ORDER BY p.nom';

  const lignes = db.prepare(query).all(...params).map((l) => {
    const taux = l.taux_horaire || 0;
    const cout = l.total_heures_normales * taux + l.total_heures_supplementaires * taux * MAJORATION_HEURES_SUP;
    return { ...l, cout_total: Math.round(cout * 100) / 100 };
  });

  res.json({
    lignes,
    cout_total_projet: Math.round(lignes.reduce((s, l) => s + l.cout_total, 0) * 100) / 100,
    majoration_heures_sup: MAJORATION_HEURES_SUP,
  });
});

// GET /api/pointages?projet_id=&personnel_id=&date_debut=&date_fin=
router.get('/', (req, res) => {
  const { projet_id, personnel_id, date_debut, date_fin } = req.query;
  let query = `
    SELECT pt.*, p.nom AS personnel_nom, f.taux_horaire
    FROM pointages pt JOIN personnel p ON p.id = pt.personnel_id LEFT JOIN fonctions f ON f.id = p.fonction_id
    WHERE 1=1
  `;
  const params = [];
  if (projet_id) { query += ' AND pt.projet_id = ?'; params.push(projet_id); }
  if (personnel_id) { query += ' AND pt.personnel_id = ?'; params.push(personnel_id); }
  if (date_debut) { query += ' AND pt.date_pointage >= ?'; params.push(date_debut); }
  if (date_fin) { query += ' AND pt.date_pointage <= ?'; params.push(date_fin); }
  query += ' ORDER BY pt.date_pointage DESC';

  res.json(db.prepare(query).all(...params));
});

// POST /api/pointages
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { personnel_id, projet_id, date_pointage, type, heures_normales, heures_supplementaires } = req.body;
  if (!personnel_id || !projet_id || !date_pointage) {
    return res.status(400).json({ error: 'personnel_id, projet_id et date_pointage sont requis' });
  }

  const info = db.prepare(`
    INSERT INTO pointages (personnel_id, projet_id, date_pointage, type, heures_normales, heures_supplementaires, saisie_par)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(personnel_id, projet_id, date_pointage, type || 'normal', heures_normales || 0, heures_supplementaires || 0, req.user.id);

  res.status(201).json(db.prepare('SELECT * FROM pointages WHERE id = ?').get(info.lastInsertRowid));
});

// DELETE /api/pointages/:id
router.delete('/:id', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const result = db.prepare('DELETE FROM pointages WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pointage introuvable' });
  res.status(204).send();
});

module.exports = router;
