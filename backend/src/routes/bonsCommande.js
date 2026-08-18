const express = require('express');
const db = require('../db');
const { genererPdfBonCommande } = require('../pdf/bonCommande');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genererReference() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM bons_commande').get().c + 1;
  return `BC-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/bons-commande?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  const rows = projet_id
    ? db.prepare(`SELECT b.*, t.nom AS fournisseur_nom FROM bons_commande b LEFT JOIN tiers t ON t.id = b.fournisseur_id WHERE b.projet_id = ? ORDER BY b.date_emission DESC`).all(projet_id)
    : db.prepare(`SELECT b.*, t.nom AS fournisseur_nom, p.nom AS projet_nom FROM bons_commande b LEFT JOIN tiers t ON t.id = b.fournisseur_id LEFT JOIN projets p ON p.id = b.projet_id ORDER BY b.date_emission DESC`).all();

  for (const bc of rows) {
    const total = db.prepare('SELECT SUM(quantite*prix_unitaire) AS t FROM bon_commande_lignes WHERE bon_commande_id = ?').get(bc.id);
    bc.montant_total = total.t || 0;
  }
  res.json(rows);
});

// GET /api/bons-commande/:id
router.get('/:id', (req, res) => {
  const bc = db.prepare(`
    SELECT b.*, t.nom AS fournisseur_nom, t.email AS fournisseur_email, t.telephone AS fournisseur_telephone
    FROM bons_commande b LEFT JOIN tiers t ON t.id = b.fournisseur_id WHERE b.id = ?
  `).get(req.params.id);
  if (!bc) return res.status(404).json({ error: 'Bon de commande introuvable' });
  bc.lignes = db.prepare('SELECT * FROM bon_commande_lignes WHERE bon_commande_id = ?').all(req.params.id);
  bc.montant_total = bc.lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0);
  res.json(bc);
});

// POST /api/bons-commande
router.post('/', requirePermission('achats', 'creer'), (req, res) => {
  const { projet_id, fournisseur_id, date_livraison_prevue, notes, lignes, rabais_pct, avance_pct, retenue_pct, delai_paiement_jours, chiffrage_poste_id } = req.body;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });

  const reference = genererReference();
  const info = db.prepare(`
    INSERT INTO bons_commande (reference, projet_id, fournisseur_id, date_livraison_prevue, notes, rabais_pct, avance_pct, retenue_pct, delai_paiement_jours, chiffrage_poste_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference, projet_id, fournisseur_id || null, date_livraison_prevue || null, notes || null,
    rabais_pct || 0, avance_pct || 0, retenue_pct || 0, delai_paiement_jours || 0, chiffrage_poste_id || null);

  if (Array.isArray(lignes)) {
    const insertLigne = db.prepare('INSERT INTO bon_commande_lignes (bon_commande_id, designation, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?)');
    for (const l of lignes) {
      insertLigne.run(info.lastInsertRowid, l.designation, l.unite || 'u', l.quantite || 0, l.prix_unitaire || 0);
    }
  }

  res.status(201).json(db.prepare('SELECT * FROM bons_commande WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/bons-commande/:id - changement de statut principalement
router.put('/:id', requirePermission('achats', 'creer'), (req, res) => {
  const fields = ['fournisseur_id', 'statut', 'date_livraison_prevue', 'notes', 'rabais_pct', 'avance_pct', 'retenue_pct', 'delai_paiement_jours', 'chiffrage_poste_id'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  const result = db.prepare(`UPDATE bons_commande SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Bon de commande introuvable' });

  res.json(db.prepare('SELECT * FROM bons_commande WHERE id = ?').get(req.params.id));
});

// PUT /api/bons-commande/:id/valider - validation par le directeur : cachet + signature appliques
router.put('/:id/valider', requirePermission('achats', 'valider'), (req, res) => {
  const bc = db.prepare('SELECT * FROM bons_commande WHERE id = ?').get(req.params.id);
  if (!bc) return res.status(404).json({ error: 'Bon de commande introuvable' });

  const entreprise = db.prepare('SELECT * FROM entreprise WHERE id = 1').get();
  if (!entreprise.cachet_url || !entreprise.signature_url) {
    return res.status(400).json({ error: "Le cachet et la signature du directeur ne sont pas encore parametres (module Entreprise)" });
  }

  db.prepare("UPDATE bons_commande SET statut = 'envoye', signature_appliquee = 1 WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM bons_commande WHERE id = ?').get(req.params.id));
});

// GET /api/bons-commande/:id/pdf - genere le document PDF telechargeable
router.get('/:id/pdf', async (req, res) => {
  const bc = db.prepare(`
    SELECT b.*, t.nom AS fournisseur_nom, t.email AS fournisseur_email, t.telephone AS fournisseur_telephone
    FROM bons_commande b LEFT JOIN tiers t ON t.id = b.fournisseur_id WHERE b.id = ?
  `).get(req.params.id);
  if (!bc) return res.status(404).json({ error: 'Bon de commande introuvable' });
  bc.lignes = db.prepare('SELECT * FROM bon_commande_lignes WHERE bon_commande_id = ?').all(req.params.id);

  const entreprise = db.prepare('SELECT * FROM entreprise WHERE id = 1').get();

  try {
    const pdfBytes = await genererPdfBonCommande(bc, entreprise);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${bc.reference}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la generation du PDF' });
  }
});

module.exports = router;
