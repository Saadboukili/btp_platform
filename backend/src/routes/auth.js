const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const centralDb = require('../db/central');
const { getTenantDb } = require('../db/tenantManager');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');
const { estVerrouille, enregistrerEchec, reinitialiserEchecs, MAX_ECHECS, DUREE_VERROUILLAGE_MIN } = require('../auth/antiBruteForce');

const router = express.Router();

// Couche 1 : limite le nombre de tentatives par adresse IP (protege contre un script qui essaie
// beaucoup de comptes differents depuis la meme machine)
const limiteurConnexion = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion depuis cette adresse. Reessayez dans quelques minutes.' },
});

// POST /api/auth/login
// 1. Essaie d'abord le compte plateforme (proprietaire, gere toutes les entreprises)
// 2. Sinon consulte l'annuaire central pour savoir a quelle entreprise appartient cet email
router.post('/login', limiteurConnexion, (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // Couche 2 : verrouillage par compte (protege un compte precis meme si l'attaquant change d'IP)
  const { verrouille, minutesRestantes } = estVerrouille(email);
  if (verrouille) {
    return res.status(429).json({ error: `Trop de tentatives echouees. Reessayez dans ${minutesRestantes} minute(s).` });
  }

  const platformAdmin = centralDb.prepare('SELECT * FROM plateforme_admins WHERE email = ?').get(email);
  if (platformAdmin && bcrypt.compareSync(mot_de_passe, platformAdmin.mot_de_passe_hash)) {
    reinitialiserEchecs(email);
    const token = jwt.sign(
      { id: platformAdmin.id, nom: platformAdmin.nom, email: platformAdmin.email, platform_admin: true },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      user: { id: platformAdmin.id, nom: platformAdmin.nom, email: platformAdmin.email, role: 'plateforme', platform_admin: true },
    });
  }

  const entree = centralDb.prepare('SELECT * FROM annuaire_utilisateurs WHERE email = ?').get(email);
  if (!entree) {
    enregistrerEchec(email);
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const tenant = centralDb.prepare('SELECT * FROM tenants WHERE id = ?').get(entree.tenant_id);
  if (!tenant) {
    enregistrerEchec(email);
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  if (tenant.statut === 'suspendu') return res.status(403).json({ error: 'Ce compte entreprise est suspendu. Contactez votre administrateur.' });

  const tenantDb = getTenantDb(tenant.id);
  const user = tenantDb.prepare('SELECT * FROM utilisateurs WHERE email = ? AND actif = 1').get(email);
  if (!user || !bcrypt.compareSync(mot_de_passe, user.mot_de_passe_hash)) {
    enregistrerEchec(email);
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  reinitialiserEchecs(email);

  const token = jwt.sign(
    { id: user.id, nom: user.nom, email: user.email, role: user.role, tenant_id: tenant.id, tenant_nom: tenant.nom },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role, tenant_nom: tenant.nom } });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
