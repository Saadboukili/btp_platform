const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/chiffrages/:id - avec postes
router.get('/:id', (req, res) => {
  const chiffrage = db.prepare('SELECT * FROM chiffrages WHERE id = ?').get(req.params.id);
  if (!chiffrage) return res.status(404).json({ error: 'Chiffrage introuvable' });
  chiffrage.postes = db.prepare('SELECT * FROM chiffrage_postes WHERE chiffrage_id = ? ORDER BY ordre, id').all(req.params.id);
  chiffrage.montant_total = chiffrage.postes.reduce((sum, p) => sum + p.quantite * p.prix_unitaire, 0);
  res.json(chiffrage);
});

// POST /api/chiffrages - creer une nouvelle version pour un projet
router.post('/', requireRole('admin', 'metreur', 'chef_projet'), (req, res) => {
  const { projet_id, notes } = req.body;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });

  const lastVersion = db.prepare('SELECT MAX(version) AS v FROM chiffrages WHERE projet_id = ?').get(projet_id);
  const version = (lastVersion.v || 0) + 1;

  const info = db.prepare('INSERT INTO chiffrages (projet_id, version, notes) VALUES (?, ?, ?)').run(projet_id, version, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM chiffrages WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/chiffrages/:id - changer le statut (brouillon -> envoye -> valide...)
router.put('/:id', requireRole('admin', 'metreur', 'chef_projet'), (req, res) => {
  const { statut, notes } = req.body;
  const existing = db.prepare('SELECT * FROM chiffrages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Chiffrage introuvable' });

  db.prepare('UPDATE chiffrages SET statut = COALESCE(?, statut), notes = COALESCE(?, notes) WHERE id = ?')
    .run(statut || null, notes || null, req.params.id);

  // si valide, on reporte le montant sur le budget du projet
  if (statut === 'valide') {
    const total = db.prepare('SELECT SUM(quantite*prix_unitaire) AS t FROM chiffrage_postes WHERE chiffrage_id = ?').get(req.params.id);
    db.prepare('UPDATE projets SET budget_prevu = ? WHERE id = ?').run(total.t || 0, existing.projet_id);
  }

  res.json(db.prepare('SELECT * FROM chiffrages WHERE id = ?').get(req.params.id));
});

// POST /api/chiffrages/:id/postes - ajouter un poste
router.post('/:id/postes', requireRole('admin', 'metreur', 'chef_projet'), (req, res) => {
  const { designation, categorie, unite, quantite, prix_unitaire, ordre } = req.body;
  if (!designation) return res.status(400).json({ error: 'designation requise' });

  const info = db.prepare(`
    INSERT INTO chiffrage_postes (chiffrage_id, designation, categorie, unite, quantite, prix_unitaire, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, designation, categorie || null, unite || 'u', quantite || 0, prix_unitaire || 0, ordre || 0);

  res.status(201).json(db.prepare('SELECT * FROM chiffrage_postes WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/chiffrages/postes/:posteId
router.put('/postes/:posteId', requireRole('admin', 'metreur', 'chef_projet'), (req, res) => {
  const fields = ['designation', 'categorie', 'unite', 'quantite', 'prix_unitaire', 'ordre'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  db.prepare(`UPDATE chiffrage_postes SET ${setClause} WHERE id = ?`).run(...values, req.params.posteId);

  res.json(db.prepare('SELECT * FROM chiffrage_postes WHERE id = ?').get(req.params.posteId));
});

// DELETE /api/chiffrages/postes/:posteId
router.delete('/postes/:posteId', requireRole('admin', 'metreur', 'chef_projet'), (req, res) => {
  db.prepare('DELETE FROM chiffrage_postes WHERE id = ?').run(req.params.posteId);
  res.status(204).send();
});

module.exports = router;
