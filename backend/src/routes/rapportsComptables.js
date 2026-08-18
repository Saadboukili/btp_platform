const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/rapports-comptables/balance?exercice_id=
router.get('/balance', (req, res) => {
  const { exercice_id } = req.query;
  if (!exercice_id) return res.status(400).json({ error: 'exercice_id requis' });

  const rows = db.prepare(`
    SELECT pc.numero, pc.intitule, pc.classe,
      COALESCE(SUM(el.debit), 0) AS total_debit,
      COALESCE(SUM(el.credit), 0) AS total_credit
    FROM plan_comptable pc
    LEFT JOIN ecriture_lignes el ON el.compte_id = pc.id
    LEFT JOIN ecritures e ON e.id = el.ecriture_id AND e.exercice_id = ? AND e.statut = 'validee'
    GROUP BY pc.id
    HAVING total_debit > 0 OR total_credit > 0
    ORDER BY pc.numero
  `).all(exercice_id);

  const lignes = rows.map((r) => ({
    ...r,
    solde_debiteur: r.total_debit > r.total_credit ? r.total_debit - r.total_credit : 0,
    solde_crediteur: r.total_credit > r.total_debit ? r.total_credit - r.total_debit : 0,
  }));

  res.json({
    lignes,
    total_debit: lignes.reduce((s, l) => s + l.total_debit, 0),
    total_credit: lignes.reduce((s, l) => s + l.total_credit, 0),
  });
});

// GET /api/rapports-comptables/grand-livre/:compteId?exercice_id=
router.get('/grand-livre/:compteId', (req, res) => {
  const { exercice_id } = req.query;
  const compte = db.prepare('SELECT * FROM plan_comptable WHERE id = ?').get(req.params.compteId);
  if (!compte) return res.status(404).json({ error: 'Compte introuvable' });

  let query = `
    SELECT el.*, e.numero_piece, e.date_ecriture, e.libelle AS ecriture_libelle, e.statut, j.code AS journal_code
    FROM ecriture_lignes el JOIN ecritures e ON e.id = el.ecriture_id JOIN journaux j ON j.id = e.journal_id
    WHERE el.compte_id = ? AND e.statut = 'validee'
  `;
  const params = [req.params.compteId];
  if (exercice_id) { query += ' AND e.exercice_id = ?'; params.push(exercice_id); }
  query += ' ORDER BY e.date_ecriture, e.id';

  const mouvements = db.prepare(query).all(...params);

  let solde = 0;
  for (const m of mouvements) {
    solde += m.debit - m.credit;
    m.solde_cumule = Math.round(solde * 100) / 100;
  }

  res.json({ compte, mouvements });
});

// GET /api/rapports-comptables/cpc?exercice_id= - compte de produits et charges simplifie
router.get('/cpc', (req, res) => {
  const { exercice_id } = req.query;
  if (!exercice_id) return res.status(400).json({ error: 'exercice_id requis' });

  const charges = db.prepare(`
    SELECT pc.numero, pc.intitule, COALESCE(SUM(el.debit) - SUM(el.credit), 0) AS montant
    FROM plan_comptable pc
    JOIN ecriture_lignes el ON el.compte_id = pc.id
    JOIN ecritures e ON e.id = el.ecriture_id AND e.exercice_id = ? AND e.statut = 'validee'
    WHERE pc.classe = 6
    GROUP BY pc.id HAVING montant != 0 ORDER BY pc.numero
  `).all(exercice_id);

  const produits = db.prepare(`
    SELECT pc.numero, pc.intitule, COALESCE(SUM(el.credit) - SUM(el.debit), 0) AS montant
    FROM plan_comptable pc
    JOIN ecriture_lignes el ON el.compte_id = pc.id
    JOIN ecritures e ON e.id = el.ecriture_id AND e.exercice_id = ? AND e.statut = 'validee'
    WHERE pc.classe = 7
    GROUP BY pc.id HAVING montant != 0 ORDER BY pc.numero
  `).all(exercice_id);

  const totalCharges = charges.reduce((s, c) => s + c.montant, 0);
  const totalProduits = produits.reduce((s, p) => s + p.montant, 0);

  res.json({
    charges,
    produits,
    total_charges: totalCharges,
    total_produits: totalProduits,
    resultat_net: totalProduits - totalCharges,
  });
});

// GET /api/rapports-comptables/tva?exercice_id= - etat TVA simplifie (comptes 3455x recuperable / 4455x facturee)
router.get('/tva', (req, res) => {
  const { exercice_id } = req.query;
  if (!exercice_id) return res.status(400).json({ error: 'exercice_id requis' });

  const mouvements = db.prepare(`
    SELECT pc.numero, pc.intitule, COALESCE(SUM(el.debit),0) AS total_debit, COALESCE(SUM(el.credit),0) AS total_credit
    FROM plan_comptable pc
    JOIN ecriture_lignes el ON el.compte_id = pc.id
    JOIN ecritures e ON e.id = el.ecriture_id AND e.exercice_id = ? AND e.statut = 'validee'
    WHERE pc.numero LIKE '345%' OR pc.numero LIKE '445%'
    GROUP BY pc.id ORDER BY pc.numero
  `).all(exercice_id);

  const tvaRecuperable = mouvements.filter((m) => m.numero.startsWith('345')).reduce((s, m) => s + m.total_debit, 0);
  const tvaFacturee = mouvements.filter((m) => m.numero.startsWith('445')).reduce((s, m) => s + m.total_credit, 0);

  res.json({
    mouvements,
    tva_recuperable: tvaRecuperable,
    tva_facturee: tvaFacturee,
    tva_a_payer: Math.max(0, tvaFacturee - tvaRecuperable),
    credit_tva: Math.max(0, tvaRecuperable - tvaFacturee),
  });
});

// GET /api/rapports-comptables/bilan?exercice_id= - bilan comptable simplifie (actif/passif)
router.get('/bilan', (req, res) => {
  const { exercice_id } = req.query;
  if (!exercice_id) return res.status(400).json({ error: 'exercice_id requis' });

  // Actif = classes 2 (immobilise) et 3 (circulant) et 5 (tresorerie), solde debiteur
  // Passif = classes 1 (financement permanent) et 4 (passif circulant), solde crediteur
  const soldeParClasse = (classes) => db.prepare(`
    SELECT pc.classe, COALESCE(SUM(el.debit),0) AS debit, COALESCE(SUM(el.credit),0) AS credit
    FROM plan_comptable pc
    LEFT JOIN ecriture_lignes el ON el.compte_id = pc.id
    LEFT JOIN ecritures e ON e.id = el.ecriture_id AND e.exercice_id = ? AND e.statut = 'validee'
    WHERE pc.classe IN (${classes.join(',')})
    GROUP BY pc.classe
  `).all(exercice_id);

  const actifLignes = soldeParClasse([2, 3, 5]);
  const passifLignes = soldeParClasse([1, 4]);

  const totalActif = actifLignes.reduce((s, l) => s + Math.max(0, l.debit - l.credit), 0);
  const totalPassif = passifLignes.reduce((s, l) => s + Math.max(0, l.credit - l.debit), 0);

  // resultat de l'exercice (classe 7 - classe 6) vient completer le passif pour equilibrer le bilan
  const resultat = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN pc.classe = 7 THEN el.credit - el.debit ELSE 0 END), 0) AS produits,
      COALESCE(SUM(CASE WHEN pc.classe = 6 THEN el.debit - el.credit ELSE 0 END), 0) AS charges
    FROM ecriture_lignes el JOIN plan_comptable pc ON pc.id = el.compte_id
    JOIN ecritures e ON e.id = el.ecriture_id AND e.exercice_id = ? AND e.statut = 'validee'
  `).get(exercice_id);
  const resultatNet = Math.round((resultat.produits - resultat.charges) * 100) / 100;

  const LABEL_CLASSE = { 1: 'Financement permanent', 2: 'Actif immobilise', 3: 'Actif circulant', 4: 'Passif circulant', 5: 'Tresorerie' };

  res.json({
    actif: actifLignes.map((l) => ({ classe: l.classe, label: LABEL_CLASSE[l.classe], montant: Math.round((l.debit - l.credit) * 100) / 100 })),
    passif: passifLignes.map((l) => ({ classe: l.classe, label: LABEL_CLASSE[l.classe], montant: Math.round((l.credit - l.debit) * 100) / 100 })),
    resultat_net: resultatNet,
    total_actif: Math.round(totalActif * 100) / 100,
    total_passif: Math.round((totalPassif + resultatNet) * 100) / 100,
    equilibre: Math.abs(totalActif - (totalPassif + resultatNet)) < 0.01,
  });
});

// GET /api/rapports-comptables/balance-agee?type=client|fournisseur - creances/dettes par anciennete
router.get('/balance-agee', (req, res) => {
  const { type } = req.query;
  const aujourdHui = new Date();

  const factures = type === 'fournisseur'
    ? db.prepare(`
        SELECT f.reference, f.date_facture, (f.montant - f.montant_regle) AS solde, t.nom AS tiers_nom
        FROM factures_sous_traitant f JOIN contrats_sous_traitance c ON c.id = f.contrat_id JOIN tiers t ON t.id = c.sous_traitant_id
        WHERE f.statut != 'reglee'
      `).all()
    : db.prepare(`
        SELECT f.reference, f.date_facture, (f.montant - f.montant_regle) AS solde, p.nom AS tiers_nom
        FROM factures_vente f JOIN projets p ON p.id = f.projet_id
        WHERE f.statut != 'reglee'
      `).all();

  const tranches = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const lignes = factures.map((f) => {
    const jours = Math.floor((aujourdHui - new Date(f.date_facture)) / (1000 * 60 * 60 * 24));
    const tranche = jours <= 30 ? '0-30' : jours <= 60 ? '31-60' : jours <= 90 ? '61-90' : '90+';
    tranches[tranche] += f.solde;
    return { ...f, jours_anciennete: jours, tranche };
  });

  res.json({ lignes, tranches, total: Object.values(tranches).reduce((s, v) => s + v, 0) });
});

module.exports = router;
