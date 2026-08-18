const centralDb = require('../db/central');

const MAX_ECHECS = 5;
const DUREE_VERROUILLAGE_MIN = 15;

// Renvoie { verrouille: bool, minutesRestantes } sans jamais reveler si le compte existe ou non
// (le meme message d'erreur generique est utilise, que le compte existe ou pas)
function estVerrouille(email) {
  const ligne = centralDb.prepare('SELECT * FROM tentatives_connexion WHERE email = ?').get(email);
  if (!ligne || !ligne.verrouille_jusqu_a) return { verrouille: false };

  const finVerrouillage = new Date(ligne.verrouille_jusqu_a);
  if (finVerrouillage > new Date()) {
    const minutesRestantes = Math.ceil((finVerrouillage - new Date()) / 60000);
    return { verrouille: true, minutesRestantes };
  }
  return { verrouille: false };
}

function enregistrerEchec(email) {
  const ligne = centralDb.prepare('SELECT * FROM tentatives_connexion WHERE email = ?').get(email);
  const echecs = (ligne?.echecs || 0) + 1;

  let verrouilleJusquA = ligne?.verrouille_jusqu_a || null;
  if (echecs >= MAX_ECHECS) {
    const dateVerrou = new Date(Date.now() + DUREE_VERROUILLAGE_MIN * 60000);
    verrouilleJusquA = dateVerrou.toISOString();
  }

  centralDb.prepare(`
    INSERT INTO tentatives_connexion (email, echecs, verrouille_jusqu_a) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET echecs = excluded.echecs, verrouille_jusqu_a = excluded.verrouille_jusqu_a
  `).run(email, echecs, verrouilleJusquA);
}

function reinitialiserEchecs(email) {
  centralDb.prepare('DELETE FROM tentatives_connexion WHERE email = ?').run(email);
}

module.exports = { estVerrouille, enregistrerEchec, reinitialiserEchecs, MAX_ECHECS, DUREE_VERROUILLAGE_MIN };
