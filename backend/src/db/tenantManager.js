const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const centralDb = require('./central');

const TENANTS_DIR = path.join(__dirname, '../../data/tenants');
fs.mkdirSync(TENANTS_DIR, { recursive: true });

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

const connexionsOuvertes = new Map(); // cache : tenant_id -> connexion Database ouverte

function getTenantDb(tenantId) {
  if (!tenantId) throw new Error('tenantId requis pour ouvrir une base entreprise');
  if (connexionsOuvertes.has(tenantId)) return connexionsOuvertes.get(tenantId);

  const dbPath = path.join(TENANTS_DIR, `${tenantId}.db`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);

  connexionsOuvertes.set(tenantId, db);
  return db;
}

function slugify(nom) {
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Cree une nouvelle entreprise cliente : enregistrement central + base de donnees isolee prete a l'emploi
function createTenant({ nom, slug }) {
  const slugFinal = slug ? slugify(slug) : slugify(nom);
  if (!slugFinal) throw new Error('Impossible de generer un identifiant a partir de ce nom');

  const existant = centralDb.prepare('SELECT * FROM tenants WHERE slug = ?').get(slugFinal);
  if (existant) throw new Error(`Une entreprise avec l'identifiant "${slugFinal}" existe deja`);

  const info = centralDb.prepare('INSERT INTO tenants (nom, slug) VALUES (?, ?)').run(nom, slugFinal);
  const tenant = centralDb.prepare('SELECT * FROM tenants WHERE id = ?').get(info.lastInsertRowid);

  getTenantDb(tenant.id); // provisionne le fichier + le schema immediatement

  return tenant;
}

// Associe un email a une entreprise dans l'annuaire central (necessaire pour que la connexion fonctionne)
function inscrireDansAnnuaire(email, tenantId) {
  centralDb.prepare('INSERT OR REPLACE INTO annuaire_utilisateurs (email, tenant_id) VALUES (?, ?)').run(email, tenantId);
}

module.exports = { getTenantDb, createTenant, inscrireDansAnnuaire, slugify };
