const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const CENTRAL_DB_PATH = path.join(__dirname, '../../data/central.db');
fs.mkdirSync(path.dirname(CENTRAL_DB_PATH), { recursive: true });

const centralDb = new Database(CENTRAL_DB_PATH);
centralDb.pragma('journal_mode = WAL');
centralDb.pragma('foreign_keys = ON');

centralDb.exec(`
  -- Entreprises clientes de la plateforme (chacune a sa propre base de donnees isolee)
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif', 'suspendu')),
    date_creation TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Le ou les comptes qui gerent la plateforme elle-meme (toi)
  CREATE TABLE IF NOT EXISTS plateforme_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL
  );

  -- Annuaire : email -> quelle entreprise (necessaire car chaque entreprise a sa propre base,
  -- il faut donc savoir laquelle ouvrir avant meme d'avoir verifie le mot de passe)
  CREATE TABLE IF NOT EXISTS annuaire_utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id)
  );

  -- Anti brute-force : verrouille un compte (par email) apres plusieurs echecs de connexion,
  -- independamment de l'adresse IP utilisee
  CREATE TABLE IF NOT EXISTS tentatives_connexion (
    email TEXT PRIMARY KEY,
    echecs INTEGER NOT NULL DEFAULT 0,
    verrouille_jusqu_a TEXT
  );
`);

module.exports = centralDb;
