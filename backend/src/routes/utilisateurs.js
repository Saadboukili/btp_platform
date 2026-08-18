const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const centralDb = require('../db/central');
const { inscrireDansAnnuaire } = require('../db/tenantManager');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const ROLES_VALIDES = ['admin', 'direction', 'chef_projet', 'conducteur_travaux', 'metreur', 'comptable', 'acheteur'];

// GET /api/utilisateurs
router.get('/', requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT id, nom, email, role, actif, created_at FROM utilisateurs ORDER BY nom').all());
});

// POST /api/utilisateurs
router.post('/', requireRole('admin'), (req, res) => {
  const { nom, email, mot_de_passe, role } = req.body;
  if (!nom || !email || !mot_de_passe || !role) return res.status(400).json({ error: 'nom, email, mot_de_passe et role sont requis' });
  if (!ROLES_VALIDES.includes(role)) return res.status(400).json({ error: 'Role invalide' });
  if (mot_de_passe.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caracteres' });

  // L'email doit etre unique sur toute la plateforme (l'annuaire central s'en sert pour router la connexion)
  const dejaUtilise = centralDb.prepare('SELECT id FROM annuaire_utilisateurs WHERE email = ?').get(email);
  if (dejaUtilise) return res.status(400).json({ error: 'Cet email est deja utilise' });

  let userId;
  try {
    const hash = bcrypt.hashSync(mot_de_passe, 10);
    const info = db.prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role) VALUES (?, ?, ?, ?)').run(nom, email, hash, role);
    userId = info.lastInsertRowid;
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Cet email est deja utilise' });
    throw err;
  }

  inscrireDansAnnuaire(email, req.user.tenant_id);

  res.status(201).json(db.prepare('SELECT id, nom, email, role, actif FROM utilisateurs WHERE id = ?').get(userId));
});

// PUT /api/utilisateurs/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const { nom, role, actif, mot_de_passe } = req.body;
  if (role && !ROLES_VALIDES.includes(role)) return res.status(400).json({ error: 'Role invalide' });

  const fields = [];
  const values = [];
  if (nom !== undefined) { fields.push('nom = ?'); values.push(nom); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (actif !== undefined) { fields.push('actif = ?'); values.push(actif ? 1 : 0); }
  if (mot_de_passe) {
    if (mot_de_passe.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caracteres' });
    fields.push('mot_de_passe_hash = ?');
    values.push(bcrypt.hashSync(mot_de_passe, 10));
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const result = db.prepare(`UPDATE utilisateurs SET ${fields.join(', ')} WHERE id = ?`).run(...values, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

  res.json(db.prepare('SELECT id, nom, email, role, actif FROM utilisateurs WHERE id = ?').get(req.params.id));
});

// ===== Affectation aux chantiers =====

// GET /api/utilisateurs/:id/projets
router.get('/:id/projets', requireRole('admin', 'direction', 'chef_projet'), (req, res) => {
  const projets = db.prepare(`
    SELECT p.id, p.nom FROM projet_utilisateurs pu JOIN projets p ON p.id = pu.projet_id WHERE pu.utilisateur_id = ?
  `).all(req.params.id);
  res.json(projets);
});

// POST /api/utilisateurs/:id/projets - affecter a un chantier
router.post('/:id/projets', requireRole('admin', 'direction', 'chef_projet'), (req, res) => {
  const { projet_id } = req.body;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });
  try {
    db.prepare('INSERT INTO projet_utilisateurs (projet_id, utilisateur_id) VALUES (?, ?)').run(projet_id, req.params.id);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Deja affecte a ce chantier' });
    throw err;
  }
});

// DELETE /api/utilisateurs/:id/projets/:projetId
router.delete('/:id/projets/:projetId', requireRole('admin', 'direction', 'chef_projet'), (req, res) => {
  db.prepare('DELETE FROM projet_utilisateurs WHERE utilisateur_id = ? AND projet_id = ?').run(req.params.id, req.params.projetId);
  res.status(204).send();
});

module.exports = router;
