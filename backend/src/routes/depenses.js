const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/depenses?projet_id=&categorie=
router.get('/', (req, res) => {
  const { projet_id, categorie } = req.query;
  let query = `SELECT d.*, p.nom AS projet_nom, u.nom AS saisie_par_nom FROM depenses d
    LEFT JOIN projets p ON p.id = d.projet_id LEFT JOIN utilisateurs u ON u.id = d.saisie_par WHERE 1=1`;
  const params = [];
  if (projet_id) { query += ' AND d.projet_id = ?'; params.push(projet_id); }
  if (categorie) { query += ' AND d.categorie = ?'; params.push(categorie); }
  query += ' ORDER BY d.date_depense DESC';

  res.json(db.prepare(query).all(...params));
});

// POST /api/depenses
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux', 'comptable'), (req, res) => {
  const { projet_id, categorie, designation, montant, date_depense, justificatif_url, chiffrage_poste_id } = req.body;
  if (!projet_id || !categorie || !designation || montant === undefined) {
    return res.status(400).json({ error: 'projet_id, categorie, designation et montant requis' });
  }

  const info = db.prepare(`
    INSERT INTO depenses (projet_id, categorie, designation, montant, date_depense, justificatif_url, saisie_par, chiffrage_poste_id)
    VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)
  `).run(projet_id, categorie, designation, montant, date_depense || null, justificatif_url || null, req.user.id, chiffrage_poste_id || null);

  res.status(201).json(db.prepare('SELECT * FROM depenses WHERE id = ?').get(info.lastInsertRowid));
});

// DELETE /api/depenses/:id
router.delete('/:id', requireRole('admin', 'comptable'), (req, res) => {
  const result = db.prepare('DELETE FROM depenses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Depense introuvable' });
  res.status(204).send();
});

module.exports = router;
