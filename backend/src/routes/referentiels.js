const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ===== CLIENTS =====
router.get('/clients', (req, res) => res.json(db.prepare('SELECT * FROM clients ORDER BY nom').all()));

router.post('/clients', requireRole('admin', 'chef_projet', 'direction'), (req, res) => {
  const { nom, contact_nom, telephone, email, adresse, ice, notes } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });
  const info = db.prepare('INSERT INTO clients (nom, contact_nom, telephone, email, adresse, ice, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(nom, contact_nom || null, telephone || null, email || null, adresse || null, ice || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/clients/:id', requireRole('admin', 'chef_projet', 'direction'), (req, res) => {
  const fields = ['nom', 'contact_nom', 'telephone', 'email', 'adresse', 'ice', 'notes'];
  const updates = fields.filter((f) => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee' });
  db.prepare(`UPDATE clients SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`).run(...updates.map((f) => req.body[f]), req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

// ===== ENTREPOTS =====
router.get('/entrepots', (req, res) => {
  res.json(db.prepare(`SELECT e.*, p.nom AS projet_nom FROM entrepots e LEFT JOIN projets p ON p.id = e.projet_id ORDER BY e.nom`).all());
});

router.post('/entrepots', requireRole('admin', 'chef_projet'), (req, res) => {
  const { nom, adresse, projet_id } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });
  const info = db.prepare('INSERT INTO entrepots (nom, adresse, projet_id) VALUES (?, ?, ?)').run(nom, adresse || null, projet_id || null);
  res.status(201).json(db.prepare('SELECT * FROM entrepots WHERE id = ?').get(info.lastInsertRowid));
});

// ===== FAMILLES PRODUITS =====
router.get('/familles-produits', (req, res) => res.json(db.prepare('SELECT * FROM familles_produits ORDER BY nom').all()));

router.post('/familles-produits', requireRole('admin', 'chef_projet', 'acheteur'), (req, res) => {
  const { nom, parent_id } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });
  try {
    const info = db.prepare('INSERT INTO familles_produits (nom, parent_id) VALUES (?, ?)').run(nom, parent_id || null);
    res.status(201).json(db.prepare('SELECT * FROM familles_produits WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Cette famille existe deja' });
    throw err;
  }
});

// ===== PRODUITS =====
router.get('/produits', (req, res) => {
  res.json(db.prepare(`
    SELECT p.*, f.nom AS famille_nom,
      COALESCE((SELECT SUM(quantite) FROM stock_niveaux WHERE produit_id = p.id), 0) AS stock_total
    FROM produits p LEFT JOIN familles_produits f ON f.id = p.famille_id ORDER BY p.designation
  `).all());
});

router.post('/produits', requireRole('admin', 'chef_projet', 'acheteur'), (req, res) => {
  const { reference, designation, famille_id, unite, seuil_alerte, notes } = req.body;
  if (!designation) return res.status(400).json({ error: 'designation requise' });
  try {
    const info = db.prepare('INSERT INTO produits (reference, designation, famille_id, unite, seuil_alerte, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(reference || null, designation, famille_id || null, unite || 'u', seuil_alerte || 0, notes || null);
    res.status(201).json(db.prepare('SELECT * FROM produits WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Cette reference existe deja' });
    throw err;
  }
});

// ===== MATERIAUTHEQUE =====
router.get('/materiautheque', (req, res) => {
  res.json(db.prepare(`
    SELECT m.*, t.nom AS fournisseur_nom FROM materiautheque m LEFT JOIN tiers t ON t.id = m.fournisseur_id ORDER BY m.designation
  `).all());
});

router.post('/materiautheque', requireRole('admin', 'chef_projet', 'metreur', 'acheteur'), (req, res) => {
  const { designation, categorie, fournisseur_id, fiche_technique_url, photo_url, notes } = req.body;
  if (!designation) return res.status(400).json({ error: 'designation requise' });
  const info = db.prepare('INSERT INTO materiautheque (designation, categorie, fournisseur_id, fiche_technique_url, photo_url, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(designation, categorie || null, fournisseur_id || null, fiche_technique_url || null, photo_url || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM materiautheque WHERE id = ?').get(info.lastInsertRowid));
});

module.exports = router;
