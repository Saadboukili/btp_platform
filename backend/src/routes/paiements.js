const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM paiements').get().c + 1;
  return `PAI-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/paiements?type=
router.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare('SELECT * FROM paiements WHERE type = ? ORDER BY date_paiement DESC').all(type)
    : db.prepare('SELECT * FROM paiements ORDER BY date_paiement DESC').all();
  for (const p of rows) {
    p.allocations = db.prepare('SELECT * FROM paiement_allocations WHERE paiement_id = ?').all(p.id);
  }
  res.json(rows);
});

// GET /api/paiements/factures-ouvertes?type=client|fournisseur - factures avec solde restant, pour allocation
router.get('/factures-ouvertes', (req, res) => {
  const { type } = req.query;
  if (type === 'fournisseur') {
    const rows = db.prepare(`
      SELECT f.id, f.reference, f.montant, f.montant_regle, (f.montant - f.montant_regle) AS solde, t.nom AS tiers_nom
      FROM factures_sous_traitant f JOIN contrats_sous_traitance c ON c.id = f.contrat_id JOIN tiers t ON t.id = c.sous_traitant_id
      WHERE f.statut != 'reglee' ORDER BY f.date_facture
    `).all();
    return res.json(rows);
  }
  const rows = db.prepare(`
    SELECT f.id, f.reference, f.montant, f.montant_regle, (f.montant - f.montant_regle) AS solde, p.nom AS tiers_nom
    FROM factures_vente f JOIN projets p ON p.id = f.projet_id
    WHERE f.statut != 'reglee' ORDER BY f.date_facture
  `).all();
  res.json(rows);
});

// POST /api/paiements - un reglement reparti sur une ou plusieurs factures
router.post('/', requirePermission('tresorerie', 'creer'), (req, res) => {
  const { type, tiers_nom, mode, compte_tresorerie_id, allocations } = req.body;
  if (!type || !tiers_nom || !Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ error: 'type, tiers_nom et au moins une allocation sont requis' });
  }

  const montantTotal = allocations.reduce((s, a) => s + (Number(a.montant) || 0), 0);
  if (montantTotal <= 0) return res.status(400).json({ error: 'Le montant total doit etre positif' });

  const reference = genRef();

  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO paiements (reference, type, tiers_nom, montant_total, mode, compte_tresorerie_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reference, type, tiers_nom, montantTotal, mode || null, compte_tresorerie_id || null);

    const insertAlloc = db.prepare('INSERT INTO paiement_allocations (paiement_id, facture_vente_id, facture_sous_traitant_id, montant) VALUES (?, ?, ?, ?)');

    for (const a of allocations) {
      const montant = Number(a.montant) || 0;
      if (montant <= 0) continue;

      if (type === 'client') {
        insertAlloc.run(info.lastInsertRowid, a.facture_id, null, montant);
        const facture = db.prepare('SELECT * FROM factures_vente WHERE id = ?').get(a.facture_id);
        const nouveauMontantRegle = facture.montant_regle + montant;
        db.prepare('UPDATE factures_vente SET montant_regle = ?, statut = ? WHERE id = ?')
          .run(nouveauMontantRegle, nouveauMontantRegle >= facture.montant ? 'reglee' : 'partiellement_reglee', a.facture_id);
      } else {
        insertAlloc.run(info.lastInsertRowid, null, a.facture_id, montant);
        const facture = db.prepare('SELECT * FROM factures_sous_traitant WHERE id = ?').get(a.facture_id);
        const nouveauMontantRegle = facture.montant_regle + montant;
        db.prepare('UPDATE factures_sous_traitant SET montant_regle = ?, statut = ? WHERE id = ?')
          .run(nouveauMontantRegle, nouveauMontantRegle >= facture.montant ? 'reglee' : 'partiellement_reglee', a.facture_id);
      }
    }

    // mouvement de tresorerie associe si un compte est precise
    if (compte_tresorerie_id) {
      db.prepare(`
        INSERT INTO tresorerie_mouvements (compte_id, type, mode, montant, libelle)
        VALUES (?, ?, ?, ?, ?)
      `).run(compte_tresorerie_id, type === 'client' ? 'encaissement' : 'decaissement', mode || null, montantTotal, `Paiement ${reference} - ${tiers_nom}`);
    }

    return info.lastInsertRowid;
  });

  const id = transaction();
  const result = db.prepare('SELECT * FROM paiements WHERE id = ?').get(id);
  result.allocations = db.prepare('SELECT * FROM paiement_allocations WHERE paiement_id = ?').all(id);
  res.status(201).json(result);
});

module.exports = router;
