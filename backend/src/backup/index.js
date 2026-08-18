const fs = require('fs');
const path = require('path');
const centralDb = require('../db/central');
const { getTenantDb } = require('../db/tenantManager');

const BACKUPS_DIR = path.join(__dirname, '../../data/backups');
const RETENTION = 14; // nombre de sauvegardes conservees (au-dela, les plus anciennes sont supprimees)

fs.mkdirSync(BACKUPS_DIR, { recursive: true });

function horodatage() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Sauvegarde a chaud (safe meme avec des ecritures en cours grace a l'API backup() de SQLite)
async function creerSauvegarde() {
  const nom = horodatage();
  const dossier = path.join(BACKUPS_DIR, nom);
  fs.mkdirSync(path.join(dossier, 'tenants'), { recursive: true });

  await centralDb.backup(path.join(dossier, 'central.db'));

  const tenants = centralDb.prepare('SELECT * FROM tenants').all();
  for (const t of tenants) {
    const db = getTenantDb(t.id);
    await db.backup(path.join(dossier, 'tenants', `${t.id}.db`));
  }

  nettoyerAnciennes();

  return { nom, nb_entreprises: tenants.length, date: new Date().toISOString() };
}

function nettoyerAnciennes() {
  const dossiers = fs.readdirSync(BACKUPS_DIR).filter((d) => fs.statSync(path.join(BACKUPS_DIR, d)).isDirectory()).sort();
  const enTrop = dossiers.length - RETENTION;
  if (enTrop > 0) {
    for (const d of dossiers.slice(0, enTrop)) {
      fs.rmSync(path.join(BACKUPS_DIR, d), { recursive: true, force: true });
    }
  }
}

function tailleDossier(p) {
  let taille = 0;
  for (const f of fs.readdirSync(p)) {
    const fp = path.join(p, f);
    const stat = fs.statSync(fp);
    taille += stat.isDirectory() ? tailleDossier(fp) : stat.size;
  }
  return taille;
}

function listerSauvegardes() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs.readdirSync(BACKUPS_DIR)
    .filter((d) => fs.statSync(path.join(BACKUPS_DIR, d)).isDirectory())
    .sort()
    .reverse()
    .map((nom) => {
      const dossier = path.join(BACKUPS_DIR, nom);
      const tenantsDir = path.join(dossier, 'tenants');
      const nbEntreprises = fs.existsSync(tenantsDir) ? fs.readdirSync(tenantsDir).length : 0;
      return { nom, nb_entreprises: nbEntreprises, taille_octets: tailleDossier(dossier) };
    });
}

// Planificateur simple : une sauvegarde immediate au demarrage, puis toutes les 24h.
function demarrerPlanificateur() {
  creerSauvegarde()
    .then((r) => console.log(`Sauvegarde automatique effectuee au demarrage : ${r.nom} (${r.nb_entreprises} entreprise(s))`))
    .catch((err) => console.error('Echec de la sauvegarde automatique au demarrage :', err.message));

  setInterval(() => {
    creerSauvegarde()
      .then((r) => console.log(`Sauvegarde automatique effectuee : ${r.nom}`))
      .catch((err) => console.error('Echec de la sauvegarde automatique :', err.message));
  }, 24 * 60 * 60 * 1000);
}

module.exports = { creerSauvegarde, listerSauvegardes, demarrerPlanificateur, BACKUPS_DIR };
