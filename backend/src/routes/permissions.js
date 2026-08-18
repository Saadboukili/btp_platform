const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const MODULES = ['projets', 'achats', 'sous_traitance', 'stock', 'budgets', 'tresorerie', 'comptabilite', 'rh', 'controle_performance', 'administration'];
const ROLES = ['direction', 'chef_projet', 'conducteur_travaux', 'metreur', 'comptable', 'acheteur']; // admin exclu : toujours acces total, non modifiable

// GET /api/permissions - matrice complete (admin uniquement pour l'edition, mais utile aussi en lecture pour l'UI)
router.get('/', requireRole('admin'), (req, res) => {
  const lignes = db.prepare('SELECT * FROM role_permissions ORDER BY role, module').all();
  res.json({ lignes, modules: MODULES, roles: ROLES });
});

// PUT /api/permissions - mise a jour en masse (l'ecran envoie la matrice entiere apres modification)
router.put('/', requireRole('admin'), (req, res) => {
  const { lignes } = req.body;
  if (!Array.isArray(lignes)) return res.status(400).json({ error: 'lignes (tableau) requis' });

  const upsert = db.prepare(`
    INSERT INTO role_permissions (role, module, peut_voir, peut_creer, peut_valider)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(role, module) DO UPDATE SET peut_voir = excluded.peut_voir, peut_creer = excluded.peut_creer, peut_valider = excluded.peut_valider
  `);

  const transaction = db.transaction(() => {
    for (const l of lignes) {
      if (!ROLES.includes(l.role) || !MODULES.includes(l.module)) continue;
      upsert.run(l.role, l.module, l.peut_voir ? 1 : 0, l.peut_creer ? 1 : 0, l.peut_valider ? 1 : 0);
    }
  });
  transaction();

  res.json({ ok: true });
});

module.exports = router;
