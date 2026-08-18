const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard - indicateurs globaux
router.get('/', (req, res) => {
  const projetsActifs = db.prepare("SELECT COUNT(*) AS c FROM projets WHERE statut = 'en_cours'").get().c;

  const budgetEngage = db.prepare("SELECT COALESCE(SUM(budget_prevu),0) AS t FROM projets WHERE statut IN ('en_cours','en_preparation')").get().t;

  const depensesReelles = db.prepare('SELECT COALESCE(SUM(montant),0) AS t FROM depenses').get().t;

  const totalBC = db.prepare(`SELECT COALESCE(SUM(bl.quantite*bl.prix_unitaire),0) AS t FROM bon_commande_lignes bl JOIN bons_commande b ON b.id = bl.bon_commande_id WHERE b.statut != 'annule'`).get().t;

  const totalSousTraitance = db.prepare("SELECT COALESCE(SUM(montant_total),0) AS t FROM contrats_sous_traitance WHERE statut != 'resilie'").get().t;

  const depensesTotales = depensesReelles + totalBC + totalSousTraitance;
  const margeMoyenne = budgetEngage > 0 ? ((budgetEngage - depensesTotales) / budgetEngage) * 100 : 0;

  const projets = db.prepare(`
    SELECT p.id, p.nom, p.statut, p.budget_prevu,
      COALESCE((SELECT SUM(montant) FROM depenses WHERE projet_id = p.id), 0) +
      COALESCE((SELECT SUM(bl.quantite*bl.prix_unitaire) FROM bon_commande_lignes bl JOIN bons_commande b ON b.id = bl.bon_commande_id WHERE b.projet_id = p.id AND b.statut != 'annule'), 0) +
      COALESCE((SELECT SUM(montant_total) FROM contrats_sous_traitance WHERE projet_id = p.id AND statut != 'resilie'), 0) AS total_engage
    FROM p ORDER BY p.created_at DESC LIMIT 10
  `.replace('FROM p', 'FROM projets p')).all();

  res.json({
    projets_actifs: projetsActifs,
    budget_engage: budgetEngage,
    depenses_reelles: Math.round(depensesTotales),
    marge_moyenne: Math.round(margeMoyenne * 10) / 10,
    projets
  });
});

module.exports = router;
