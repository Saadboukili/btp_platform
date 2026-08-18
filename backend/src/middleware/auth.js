const jwt = require('jsonwebtoken');
const tenantContext = require('../db/tenantContext');
const { getTenantDb } = require('../db/tenantManager');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Compte plateforme (proprietaire) qui n'a pas "endosse" une entreprise en particulier :
    // ces routes (/api/plateforme/...) n'ont pas besoin d'une base entreprise.
    if (decoded.platform_admin && !decoded.tenant_id) {
      return next();
    }

    // Tout le reste (utilisateurs normaux, ou plateforme en train de visiter une entreprise)
    // s'execute avec la base de la bonne entreprise automatiquement branchee.
    const tenantDb = getTenantDb(decoded.tenant_id);
    tenantContext.run({ db: tenantDb, tenantId: decoded.tenant_id }, () => next());
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expire' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acces refuse pour ce role' });
    }
    next();
  };
}

function requirePermission(module, action) {
  const colonne = { voir: 'peut_voir', creer: 'peut_creer', valider: 'peut_valider' }[action];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise' });
    if (req.user.role === 'admin') return next();

    const db = require('../db');
    const perm = db.prepare('SELECT * FROM role_permissions WHERE role = ? AND module = ?').get(req.user.role, module);
    if (!perm || !perm[colonne]) {
      return res.status(403).json({ error: `Permission refusee : ${action} sur le module "${module}"` });
    }
    next();
  };
}

// Reserve aux comptes plateforme (proprietaire), independamment de toute entreprise
function requirePlatformAdmin(req, res, next) {
  if (!req.user || !req.user.platform_admin) {
    return res.status(403).json({ error: 'Reserve au compte plateforme' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requirePermission, requirePlatformAdmin, JWT_SECRET };
