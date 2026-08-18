const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function calculerBilan(projetId) {
  const projet = db.prepare('SELECT * FROM projets WHERE id = ?').get(projetId);
  if (!projet) return null;

  // Revenu previsionnel = bordereau de prix du/des contrat(s) client, hors brouillon
  const revenuBudget = db.prepare(`
    SELECT COALESCE(SUM(cl.quantite * cl.prix_unitaire), 0) AS t
    FROM contrat_lignes cl JOIN contrats c ON c.id = cl.contrat_id
    WHERE c.projet_id = ? AND c.statut != 'brouillon'
  `).get(projetId).t;

  // Cout previsionnel = budget du chiffrage valide
  const coutBudget = projet.budget_prevu || 0;

  // Revenu reel = decomptes valides ou factures (montant brut HT, avancement reconnu)
  const revenuReel = db.prepare(`
    SELECT COALESCE(SUM(d.montant_brut), 0) AS t
    FROM decomptes d JOIN attachements a ON a.id = d.attachement_id JOIN contrats c ON c.id = a.contrat_id
    WHERE c.projet_id = ? AND d.statut IN ('valide', 'facture')
  `).get(projetId).t;

  // Cout reel = depenses + achats receptionnes/commandes (hors annule) + sous-traitance
  const coutDepenses = db.prepare('SELECT COALESCE(SUM(montant),0) AS t FROM depenses WHERE projet_id = ?').get(projetId).t;
  const coutAchats = db.prepare(`
    SELECT COALESCE(SUM(bl.quantite*bl.prix_unitaire),0) AS t FROM bons_commande b
    JOIN bon_commande_lignes bl ON bl.bon_commande_id = b.id
    WHERE b.projet_id = ? AND b.statut != 'annule'
  `).get(projetId).t;
  const coutSousTraitance = db.prepare(`
    SELECT COALESCE(SUM(montant_total),0) AS t FROM contrats_sous_traitance WHERE projet_id = ? AND statut != 'resilie'
  `).get(projetId).t;
  const coutReel = coutDepenses + coutAchats + coutSousTraitance;

  const margePrevue = revenuBudget - coutBudget;
  const margeReelle = revenuReel - coutReel;

  return {
    projet_id: projet.id,
    projet_nom: projet.nom,
    statut: projet.statut,
    previsionnel: {
      revenu: revenuBudget,
      cout: coutBudget,
      marge: margePrevue,
      taux_marge: revenuBudget > 0 ? Math.round((margePrevue / revenuBudget) * 1000) / 10 : null,
    },
    reel: {
      revenu: revenuReel,
      cout: coutReel,
      cout_depenses: coutDepenses,
      cout_achats: coutAchats,
      cout_sous_traitance: coutSousTraitance,
      marge: margeReelle,
      taux_marge: revenuReel > 0 ? Math.round((margeReelle / revenuReel) * 1000) / 10 : null,
    },
    ecart_marge: margeReelle - margePrevue,
  };
}

// GET /api/bilan-chantier/:projetId
router.get('/:projetId', (req, res) => {
  const bilan = calculerBilan(req.params.projetId);
  if (!bilan) return res.status(404).json({ error: 'Projet introuvable' });
  res.json(bilan);
});

// GET /api/bilan-chantier - vue globale tous chantiers actifs/termines
router.get('/', (req, res) => {
  const projets = db.prepare("SELECT id FROM projets WHERE statut IN ('en_cours','termine','en_preparation') ORDER BY nom").all();
  const bilans = projets.map((p) => calculerBilan(p.id));

  res.json({
    chantiers: bilans,
    total_revenu_reel: bilans.reduce((s, b) => s + b.reel.revenu, 0),
    total_cout_reel: bilans.reduce((s, b) => s + b.reel.cout, 0),
    total_marge_reelle: bilans.reduce((s, b) => s + b.reel.marge, 0),
    total_marge_prevue: bilans.reduce((s, b) => s + b.previsionnel.marge, 0),
  });
});

module.exports = router;
