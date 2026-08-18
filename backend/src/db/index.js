const tenantContext = require('./tenantContext');

// Proxy transparent : tous les fichiers de routes existants continuent de faire
// `const db = require('../db')` puis `db.prepare(...)` sans rien changer.
// En coulisses, chaque appel est redirige vers la base de l'entreprise (tenant)
// actuellement associee a la requete HTTP en cours (voir middleware/auth.js).
const db = new Proxy({}, {
  get(_target, prop) {
    const store = tenantContext.getStore();
    if (!store || !store.db) {
      throw new Error(
        "Aucun contexte entreprise actif : cet appel a la base de donnees doit se faire " +
        "a l'interieur d'une requete authentifiee (passee par requireAuth), ou via tenantContext.run(...) explicitement."
      );
    }
    const reelle = store.db;
    const valeur = reelle[prop];
    return typeof valeur === 'function' ? valeur.bind(reelle) : valeur;
  },
});

module.exports = db;
