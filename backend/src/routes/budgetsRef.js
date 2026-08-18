const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ===== POSTES BUDGETAIRES (plan hierarchique reutilisable) =====
router.get('/postes-budgetaires', (req, res) => {
  res.json(db.prepare('SELECT * FROM postes_budgetaires_ref ORDER BY categorie, code').all());
});

router.post('/postes-budgetaires', requireRole('admin', 'direction', 'chef_projet'), (req, res) => {
  const { code, nom, categorie, parent_id } = req.body;
  if (!code || !nom || !categorie) return res.status(400).json({ error: 'code, nom et categorie sont requis' });
  try {
    const info = db.prepare('INSERT INTO postes_budgetaires_ref (code, nom, categorie, parent_id) VALUES (?, ?, ?, ?)').run(code, nom, categorie, parent_id || null);
    res.status(201).json(db.prepare('SELECT * FROM postes_budgetaires_ref WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ce code existe deja' });
    throw err;
  }
});

// ===== BIBLIOTHEQUE DE COUTS (sous-traitance / materiel, reutilisable dans les budgets) =====
router.get('/bibliotheque-couts', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare('SELECT * FROM bibliotheque_couts WHERE type = ? ORDER BY designation').all(type)
    : db.prepare('SELECT * FROM bibliotheque_couts ORDER BY type, designation').all();
  res.json(rows);
});

router.post('/bibliotheque-couts', requireRole('admin', 'direction', 'chef_projet', 'metreur'), (req, res) => {
  const { designation, type, unite, cout_unitaire, notes } = req.body;
  if (!designation || !type) return res.status(400).json({ error: 'designation et type sont requis' });
  const info = db.prepare('INSERT INTO bibliotheque_couts (designation, type, unite, cout_unitaire, notes) VALUES (?, ?, ?, ?, ?)')
    .run(designation, type, unite || 'u', cout_unitaire || 0, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM bibliotheque_couts WHERE id = ?').get(info.lastInsertRowid));
});

// ===== TYPES DE PRESTATION =====
router.get('/types-prestation', (req, res) => {
  const types = db.prepare('SELECT * FROM types_prestation ORDER BY nom').all();
  for (const t of types) {
    t.ressources = db.prepare('SELECT * FROM estimations_prestations WHERE type_prestation_id = ?').all(t.id);
  }
  res.json(types);
});

router.post('/types-prestation', requireRole('admin', 'direction', 'chef_projet', 'metreur'), (req, res) => {
  const { nom, unite } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });
  try {
    const info = db.prepare('INSERT INTO types_prestation (nom, unite) VALUES (?, ?)').run(nom, unite || 'm2');
    res.status(201).json(db.prepare('SELECT * FROM types_prestation WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ce type de prestation existe deja' });
    throw err;
  }
});

// ===== ESTIMATIONS PRESTATIONS (composition ressources d'un type de prestation) =====
router.post('/types-prestation/:id/ressources', requireRole('admin', 'direction', 'chef_projet', 'metreur'), (req, res) => {
  const { designation, ressource_type, quantite_par_unite, cout_unitaire } = req.body;
  if (!designation || !ressource_type) return res.status(400).json({ error: 'designation et ressource_type sont requis' });

  const info = db.prepare(`
    INSERT INTO estimations_prestations (type_prestation_id, designation, ressource_type, quantite_par_unite, cout_unitaire)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, designation, ressource_type, quantite_par_unite || 0, cout_unitaire || 0);

  res.status(201).json(db.prepare('SELECT * FROM estimations_prestations WHERE id = ?').get(info.lastInsertRowid));
});

// GET /api/budgets-ref/types-prestation/:id/cout-unitaire-total - cout total au m2/unite (somme des ressources)
router.get('/types-prestation/:id/cout-unitaire-total', (req, res) => {
  const ressources = db.prepare('SELECT * FROM estimations_prestations WHERE type_prestation_id = ?').all(req.params.id);
  const total = ressources.reduce((s, r) => s + r.quantite_par_unite * r.cout_unitaire, 0);
  res.json({ cout_unitaire_total: Math.round(total * 100) / 100, ressources });
});

module.exports = router;
