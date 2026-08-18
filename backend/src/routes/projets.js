const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/projets - liste avec totaux calcules
router.get('/', (req, res) => {
  const projets = db.prepare(`
    SELECT p.*,
      COALESCE((SELECT SUM(quantite*prix_unitaire) FROM chiffrage_postes cp
        JOIN chiffrages c ON c.id = cp.chiffrage_id WHERE c.projet_id = p.id AND c.statut = 'valide'), 0) AS budget_chiffre,
      COALESCE((SELECT SUM(montant) FROM depenses WHERE projet_id = p.id), 0) AS total_depenses,
      COALESCE((SELECT SUM(quantite*prix_unitaire) FROM bon_commande_lignes bl
        JOIN bons_commande b ON b.id = bl.bon_commande_id WHERE b.projet_id = p.id AND b.statut != 'annule'), 0) AS total_bc,
      COALESCE((SELECT SUM(montant_total) FROM contrats_sous_traitance WHERE projet_id = p.id AND statut != 'resilie'), 0) AS total_sous_traitance
    FROM projets p ORDER BY p.created_at DESC
  `).all();
  res.json(projets);
});

// GET /api/projets/:id - fiche detaillee
router.get('/:id', (req, res) => {
  const projet = db.prepare('SELECT * FROM projets WHERE id = ?').get(req.params.id);
  if (!projet) return res.status(404).json({ error: 'Projet introuvable' });

  projet.chiffrages = db.prepare('SELECT * FROM chiffrages WHERE projet_id = ? ORDER BY version DESC').all(req.params.id);
  projet.bons_commande = db.prepare(`
    SELECT b.*, t.nom AS fournisseur_nom,
      COALESCE((SELECT SUM(quantite*prix_unitaire) FROM bon_commande_lignes WHERE bon_commande_id = b.id), 0) AS montant_total
    FROM bons_commande b LEFT JOIN tiers t ON t.id = b.fournisseur_id
    WHERE b.projet_id = ? ORDER BY b.date_emission DESC
  `).all(req.params.id);
  projet.contrats_sous_traitance = db.prepare(`
    SELECT cst.*, t.nom AS sous_traitant_nom FROM contrats_sous_traitance cst
    LEFT JOIN tiers t ON t.id = cst.sous_traitant_id WHERE cst.projet_id = ?
  `).all(req.params.id);
  projet.depenses = db.prepare('SELECT * FROM depenses WHERE projet_id = ? ORDER BY date_depense DESC').all(req.params.id);

  res.json(projet);
});

// POST /api/projets
router.post('/', requireRole('admin'), (req, res) => {
  const { nom, client, localisation, date_debut_prevue, date_fin_prevue, budget_prevu, statut, chef_projet_id } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom du projet est requis' });

  const info = db.prepare(`
    INSERT INTO projets (nom, client, localisation, date_debut_prevue, date_fin_prevue, budget_prevu, statut, chef_projet_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nom, client || null, localisation || null, date_debut_prevue || null, date_fin_prevue || null, budget_prevu || 0, statut || 'en_preparation', chef_projet_id || null);

  res.status(201).json(db.prepare('SELECT * FROM projets WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/projets/:id
router.put('/:id', requireRole('admin', 'direction', 'chef_projet'), (req, res) => {
  const existing = db.prepare('SELECT * FROM projets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Projet introuvable' });

  const fields = ['nom', 'client', 'localisation', 'date_debut_prevue', 'date_fin_prevue', 'date_debut_reelle', 'date_fin_reelle', 'budget_prevu', 'statut', 'chef_projet_id'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  db.prepare(`UPDATE projets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);

  res.json(db.prepare('SELECT * FROM projets WHERE id = ?').get(req.params.id));
});

// DELETE /api/projets/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM projets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Projet introuvable' });
  res.status(204).send();
});

module.exports = router;
