const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function soldeCompte(compteId) {
  const compte = db.prepare('SELECT * FROM tresorerie_comptes WHERE id = ?').get(compteId);
  const mvts = db.prepare('SELECT type, SUM(montant) AS t FROM tresorerie_mouvements WHERE compte_id = ? GROUP BY type').all(compteId);
  let solde = compte.solde_initial;
  for (const m of mvts) solde += m.type === 'encaissement' ? m.t : -m.t;
  return solde;
}

// GET /api/tresorerie/comptes
router.get('/comptes', (req, res) => {
  const comptes = db.prepare('SELECT * FROM tresorerie_comptes ORDER BY nom').all();
  for (const c of comptes) c.solde = soldeCompte(c.id);
  res.json(comptes);
});

// POST /api/tresorerie/comptes
router.post('/comptes', requirePermission('tresorerie', 'creer'), (req, res) => {
  const { nom, type, solde_initial } = req.body;
  if (!nom || !type) return res.status(400).json({ error: 'nom et type requis' });

  const info = db.prepare('INSERT INTO tresorerie_comptes (nom, type, solde_initial) VALUES (?, ?, ?)')
    .run(nom, type, solde_initial || 0);
  res.status(201).json(db.prepare('SELECT * FROM tresorerie_comptes WHERE id = ?').get(info.lastInsertRowid));
});

// GET /api/tresorerie/mouvements?compte_id=&projet_id=
router.get('/mouvements', (req, res) => {
  const { compte_id, projet_id } = req.query;
  let query = `SELECT m.*, c.nom AS compte_nom, p.nom AS projet_nom FROM tresorerie_mouvements m
    JOIN tresorerie_comptes c ON c.id = m.compte_id LEFT JOIN projets p ON p.id = m.projet_id WHERE 1=1`;
  const params = [];
  if (compte_id) { query += ' AND m.compte_id = ?'; params.push(compte_id); }
  if (projet_id) { query += ' AND m.projet_id = ?'; params.push(projet_id); }
  query += ' ORDER BY m.date_mouvement DESC';

  res.json(db.prepare(query).all(...params));
});

// POST /api/tresorerie/mouvements
router.post('/mouvements', requirePermission('tresorerie', 'creer'), (req, res) => {
  const { compte_id, type, mode, montant, libelle, projet_id, date_mouvement } = req.body;
  if (!compte_id || !type || !montant || !libelle) {
    return res.status(400).json({ error: 'compte_id, type, montant et libelle sont requis' });
  }

  const info = db.prepare(`
    INSERT INTO tresorerie_mouvements (compte_id, type, mode, montant, libelle, projet_id, date_mouvement)
    VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(compte_id, type, mode || null, montant, libelle, projet_id || null, date_mouvement || null);

  res.status(201).json(db.prepare('SELECT * FROM tresorerie_mouvements WHERE id = ?').get(info.lastInsertRowid));
});

// GET /api/tresorerie/solde-global
router.get('/solde-global', (req, res) => {
  const comptes = db.prepare('SELECT * FROM tresorerie_comptes').all();
  const soldeBanque = comptes.filter(c => c.type === 'banque').reduce((s, c) => s + soldeCompte(c.id), 0);
  const soldeCaisse = comptes.filter(c => c.type === 'caisse').reduce((s, c) => s + soldeCompte(c.id), 0);
  res.json({ solde_banque: soldeBanque, solde_caisse: soldeCaisse, solde_total: soldeBanque + soldeCaisse });
});

module.exports = router;
