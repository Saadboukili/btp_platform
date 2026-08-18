const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Calcule le rapprochement poste par poste pour un projet donne, a partir du chiffrage valide (= budget)
function calculerRapprochement(projetId) {
  const chiffrage = db.prepare("SELECT * FROM chiffrages WHERE projet_id = ? AND statut = 'valide' ORDER BY version DESC LIMIT 1").get(projetId);
  if (!chiffrage) return null;

  const postes = db.prepare('SELECT * FROM chiffrage_postes WHERE chiffrage_id = ? ORDER BY ordre, id').all(chiffrage.id);

  const achatsParPoste = db.prepare(`
    SELECT chiffrage_poste_id AS poste_id, COALESCE(SUM(bl.quantite*bl.prix_unitaire),0) AS montant
    FROM bons_commande b JOIN bon_commande_lignes bl ON bl.bon_commande_id = b.id
    WHERE b.projet_id = ? AND b.statut != 'annule' AND b.chiffrage_poste_id IS NOT NULL
    GROUP BY b.chiffrage_poste_id
  `).all(projetId);

  const depensesParPoste = db.prepare(`
    SELECT chiffrage_poste_id AS poste_id, COALESCE(SUM(montant),0) AS montant
    FROM depenses WHERE projet_id = ? AND chiffrage_poste_id IS NOT NULL
    GROUP BY chiffrage_poste_id
  `).all(projetId);

  const sousTraitanceParPoste = db.prepare(`
    SELECT chiffrage_poste_id AS poste_id, COALESCE(SUM(montant_total),0) AS montant
    FROM contrats_sous_traitance WHERE projet_id = ? AND statut != 'resilie' AND chiffrage_poste_id IS NOT NULL
    GROUP BY chiffrage_poste_id
  `).all(projetId);

  const mapMontant = (rows) => Object.fromEntries(rows.map((r) => [r.poste_id, r.montant]));
  const achatsMap = mapMontant(achatsParPoste);
  const depensesMap = mapMontant(depensesParPoste);
  const sousTraitanceMap = mapMontant(sousTraitanceParPoste);

  // montants non affectes a un poste precis (a affecter manuellement)
  const nonAffecteAchats = db.prepare(`
    SELECT COALESCE(SUM(bl.quantite*bl.prix_unitaire),0) AS t FROM bons_commande b
    JOIN bon_commande_lignes bl ON bl.bon_commande_id = b.id
    WHERE b.projet_id = ? AND b.statut != 'annule' AND b.chiffrage_poste_id IS NULL
  `).get(projetId).t;
  const nonAffecteDepenses = db.prepare(`SELECT COALESCE(SUM(montant),0) AS t FROM depenses WHERE projet_id = ? AND chiffrage_poste_id IS NULL`).get(projetId).t;
  const nonAffecteSousTraitance = db.prepare(`SELECT COALESCE(SUM(montant_total),0) AS t FROM contrats_sous_traitance WHERE projet_id = ? AND statut != 'resilie' AND chiffrage_poste_id IS NULL`).get(projetId).t;

  const lignes = postes.map((p) => {
    const budget = p.quantite * p.prix_unitaire;
    const engageAchats = achatsMap[p.id] || 0;
    const engageDepenses = depensesMap[p.id] || 0;
    const engageSousTraitance = sousTraitanceMap[p.id] || 0;
    const engage = engageAchats + engageDepenses + engageSousTraitance;
    const ecart = budget - engage;
    return {
      poste_id: p.id,
      designation: p.designation,
      categorie: p.categorie,
      budget,
      engage_achats: engageAchats,
      engage_depenses: engageDepenses,
      engage_sous_traitance: engageSousTraitance,
      engage_total: engage,
      ecart,
      taux_engagement: budget > 0 ? Math.round((engage / budget) * 1000) / 10 : null,
      depassement: ecart < 0,
    };
  });

  const totalBudget = lignes.reduce((s, l) => s + l.budget, 0);
  const totalEngage = lignes.reduce((s, l) => s + l.engage_total, 0);
  const nonAffecte = nonAffecteAchats + nonAffecteDepenses + nonAffecteSousTraitance;

  return {
    chiffrage_id: chiffrage.id,
    lignes,
    total_budget: totalBudget,
    total_engage: totalEngage,
    total_ecart: totalBudget - totalEngage,
    non_affecte: nonAffecte,
    postes_en_depassement: lignes.filter((l) => l.depassement).length,
  };
}

// GET /api/controle-budgetaire/:projetId
router.get('/:projetId', (req, res) => {
  const rapprochement = calculerRapprochement(req.params.projetId);
  if (!rapprochement) return res.status(404).json({ error: 'Aucun budget (chiffrage valide) trouve pour ce projet' });
  res.json(rapprochement);
});

// GET /api/controle-budgetaire - tableau de bord CB global (tous chantiers en cours)
router.get('/', (req, res) => {
  const projets = db.prepare("SELECT id, nom, statut FROM projets WHERE statut IN ('en_cours','en_preparation') ORDER BY nom").all();

  const resultats = projets.map((p) => {
    const r = calculerRapprochement(p.id);
    if (!r) return { projet_id: p.id, projet_nom: p.nom, statut: p.statut, sans_budget: true };
    return {
      projet_id: p.id,
      projet_nom: p.nom,
      statut: p.statut,
      total_budget: r.total_budget,
      total_engage: r.total_engage,
      total_ecart: r.total_ecart,
      taux_engagement: r.total_budget > 0 ? Math.round((r.total_engage / r.total_budget) * 1000) / 10 : null,
      postes_en_depassement: r.postes_en_depassement,
    };
  });

  const avecBudget = resultats.filter((r) => !r.sans_budget);
  res.json({
    projets: resultats,
    total_budget_global: avecBudget.reduce((s, r) => s + r.total_budget, 0),
    total_engage_global: avecBudget.reduce((s, r) => s + r.total_engage, 0),
    chantiers_en_depassement: avecBudget.filter((r) => r.total_ecart < 0).length,
  });
});

module.exports = router;
