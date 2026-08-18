const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ===== PLAN COMPTABLE =====
router.get('/plan-comptable', (req, res) => {
  res.json(db.prepare('SELECT * FROM plan_comptable ORDER BY numero').all());
});

router.post('/plan-comptable', requireRole('admin', 'comptable'), (req, res) => {
  const { numero, intitule, classe } = req.body;
  if (!numero || !intitule || !classe) return res.status(400).json({ error: 'numero, intitule et classe requis' });
  try {
    const info = db.prepare('INSERT INTO plan_comptable (numero, intitule, classe) VALUES (?, ?, ?)').run(numero, intitule, classe);
    res.status(201).json(db.prepare('SELECT * FROM plan_comptable WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ce numero de compte existe deja' });
    throw err;
  }
});

// ===== JOURNAUX =====
router.get('/journaux', (req, res) => {
  res.json(db.prepare('SELECT * FROM journaux ORDER BY code').all());
});

router.post('/journaux', requireRole('admin', 'comptable'), (req, res) => {
  const { code, nom, type } = req.body;
  if (!code || !nom || !type) return res.status(400).json({ error: 'code, nom et type requis' });
  try {
    const info = db.prepare('INSERT INTO journaux (code, nom, type) VALUES (?, ?, ?)').run(code, nom, type);
    res.status(201).json(db.prepare('SELECT * FROM journaux WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ce code journal existe deja' });
    throw err;
  }
});

// ===== EXERCICES =====
router.get('/exercices', (req, res) => {
  res.json(db.prepare('SELECT * FROM exercices_comptables ORDER BY annee DESC').all());
});

router.post('/exercices', requireRole('admin', 'comptable'), (req, res) => {
  const { annee, date_debut, date_fin } = req.body;
  if (!annee || !date_debut || !date_fin) return res.status(400).json({ error: 'annee, date_debut et date_fin requis' });
  try {
    const info = db.prepare('INSERT INTO exercices_comptables (annee, date_debut, date_fin) VALUES (?, ?, ?)').run(annee, date_debut, date_fin);
    res.status(201).json(db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Cet exercice existe deja' });
    throw err;
  }
});

router.put('/exercices/:id/cloturer', requireRole('admin', 'comptable'), (req, res) => {
  const nonEquilibrees = db.prepare(`
    SELECT COUNT(*) AS c FROM ecritures WHERE exercice_id = ? AND statut = 'brouillon'
  `).get(req.params.id).c;
  if (nonEquilibrees > 0) return res.status(400).json({ error: `${nonEquilibrees} ecriture(s) en brouillon doivent etre validees avant cloture` });

  db.prepare("UPDATE exercices_comptables SET statut = 'cloture' WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(req.params.id));
});

module.exports = router;
