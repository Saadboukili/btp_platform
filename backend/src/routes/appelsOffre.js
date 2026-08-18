const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef(table, prefix) {
  const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c + 1;
  return `${prefix}-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/appels-offre
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM appels_offre ORDER BY date_creation DESC').all();
  for (const ao of rows) {
    const t = db.prepare('SELECT SUM(quantite*prix_vente_unitaire) AS t FROM appel_offre_lignes WHERE appel_offre_id = ?').get(ao.id);
    ao.montant_prix_vente = t.t || 0;
  }
  res.json(rows);
});

// GET /api/appels-offre/:id
router.get('/:id', (req, res) => {
  const ao = db.prepare('SELECT * FROM appels_offre WHERE id = ?').get(req.params.id);
  if (!ao) return res.status(404).json({ error: 'Appel d\'offre introuvable' });
  ao.lignes = db.prepare('SELECT * FROM appel_offre_lignes WHERE appel_offre_id = ?').all(req.params.id);
  ao.montant_cout = ao.lignes.reduce((s, l) => s + l.quantite * l.cout_unitaire, 0);
  ao.montant_prix_vente = ao.lignes.reduce((s, l) => s + l.quantite * l.prix_vente_unitaire, 0);
  res.json(ao);
});

// POST /api/appels-offre
router.post('/', requireRole('admin', 'chef_projet', 'metreur'), (req, res) => {
  const { nom, client, coefficient, charges_indirectes_pct, marge_pct, notes } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });

  const reference = genRef('appels_offre', 'AO');
  const info = db.prepare(`
    INSERT INTO appels_offre (reference, nom, client, coefficient, charges_indirectes_pct, marge_pct, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(reference, nom, client || null, coefficient || 1, charges_indirectes_pct || 0, marge_pct || 0, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM appels_offre WHERE id = ?').get(info.lastInsertRowid));
});

// POST /api/appels-offre/:id/lignes - ajout prestation/ressource chiffree
router.post('/:id/lignes', requireRole('admin', 'chef_projet', 'metreur'), (req, res) => {
  const { designation, categorie, unite, quantite, cout_unitaire, prix_vente_unitaire } = req.body;
  if (!designation) return res.status(400).json({ error: 'designation requise' });

  const info = db.prepare(`
    INSERT INTO appel_offre_lignes (appel_offre_id, designation, categorie, unite, quantite, cout_unitaire, prix_vente_unitaire)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, designation, categorie || 'autre', unite || 'u', quantite || 0, cout_unitaire || 0, prix_vente_unitaire || 0);

  db.prepare("UPDATE appels_offre SET statut = 'chiffrage' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);

  res.status(201).json(db.prepare('SELECT * FROM appel_offre_lignes WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/appels-offre/:id/valider
// Cree automatiquement : le projet (chantier), le contrat (bordereau de prix = lignes en prix de vente),
// et le budget initial (chiffrage valide = lignes en cout, ressources chiffrees)
router.put('/:id/valider', requireRole('admin', 'direction'), (req, res) => {
  const ao = db.prepare('SELECT * FROM appels_offre WHERE id = ?').get(req.params.id);
  if (!ao) return res.status(404).json({ error: 'Appel d\'offre introuvable' });
  if (ao.statut === 'valide') return res.status(400).json({ error: 'Cet appel d\'offre est deja valide' });

  const lignes = db.prepare('SELECT * FROM appel_offre_lignes WHERE appel_offre_id = ?').all(req.params.id);
  if (lignes.length === 0) return res.status(400).json({ error: 'Aucune ligne chiffree sur cet appel d\'offre' });

  const budgetInitial = lignes.reduce((s, l) => s + l.quantite * l.cout_unitaire, 0);

  const transaction = db.transaction(() => {
    // 1. Creation du projet / chantier
    const projetInfo = db.prepare(`
      INSERT INTO projets (nom, client, statut, budget_prevu)
      VALUES (?, ?, 'en_preparation', ?)
    `).run(ao.nom, ao.client || null, budgetInitial);
    const projetId = projetInfo.lastInsertRowid;

    // 2. Creation du contrat client (bordereau de prix = lignes en prix de vente)
    const referenceContrat = genRef('contrats', 'CTR');
    const contratInfo = db.prepare(`
      INSERT INTO contrats (reference, projet_id, statut, appel_offre_id)
      VALUES (?, ?, 'valide', ?)
    `).run(referenceContrat, projetId, ao.id);

    const insertLigneContrat = db.prepare('INSERT INTO contrat_lignes (contrat_id, designation, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?)');
    for (const l of lignes) insertLigneContrat.run(contratInfo.lastInsertRowid, l.designation, l.unite, l.quantite, l.prix_vente_unitaire);

    // 3. Creation du budget initial (chiffrage valide = lignes en cout)
    const chiffrageInfo = db.prepare(`INSERT INTO chiffrages (projet_id, version, statut) VALUES (?, 1, 'valide')`).run(projetId);
    const insertPoste = db.prepare('INSERT INTO chiffrage_postes (chiffrage_id, designation, categorie, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?, ?)');
    for (const l of lignes) insertPoste.run(chiffrageInfo.lastInsertRowid, l.designation, l.categorie, l.unite, l.quantite, l.cout_unitaire);

    db.prepare("UPDATE appels_offre SET statut = 'valide', projet_id = ? WHERE id = ?").run(projetId, ao.id);

    return { projetId, contratId: contratInfo.lastInsertRowid };
  });

  const { projetId, contratId } = transaction();

  res.json({
    appel_offre: db.prepare('SELECT * FROM appels_offre WHERE id = ?').get(ao.id),
    projet: db.prepare('SELECT * FROM projets WHERE id = ?').get(projetId),
    contrat: db.prepare('SELECT * FROM contrats WHERE id = ?').get(contratId),
  });
});

module.exports = router;
