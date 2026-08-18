const { AsyncLocalStorage } = require('async_hooks');

// Permet a n'importe quel fichier de route existant (qui fait juste `const db = require('../db')`)
// de continuer a fonctionner sans aucune modification : le "vrai" objet Database est resolu
// automatiquement en fonction de la requete HTTP en cours, via ce contexte.
const tenantContext = new AsyncLocalStorage();

module.exports = tenantContext;
