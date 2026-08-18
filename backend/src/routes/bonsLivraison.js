const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM bons_livraison').get().c + 1;
  return `BL-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/bons-livraison?bon_commande_id=
router.get('/', (req, res) => {
  const { bon_commande_id } = req.query;
  const rows = bon_commande_id
    ? db.prepare('SELECT * FROM bons_livraison WHERE bon_commande_id = ? ORDER BY date_reception DESC').all(bon_commande_id)
    : db.prepare(`
        SELECT bl.*, b.reference AS bon_commande_reference, p.nom AS projet_nom
        FROM bons_livraison bl
        JOIN bons_commande b ON b.id = bl.bon_commande_id
        JOIN projets p ON p.id = b.projet_id
        ORDER BY bl.date_reception DESC
      `).all();
  res.json(rows);
});

// GET /api/bons-livraison/:id
router.get('/:id', (req, res) => {
  const bl = db.prepare('SELECT * FROM bons_livraison WHERE id = ?').get(req.params.id);
  if (!bl) return res.status(404).json({ error: 'Bon de livraison introuvable' });
  bl.lignes = db.prepare(`
    SELECT bll.*, bcl.designation, bcl.unite, bcl.quantite AS quantite_commandee
    FROM bon_livraison_lignes bll JOIN bon_commande_lignes bcl ON bcl.id = bll.bon_commande_ligne_id
    WHERE bll.bon_livraison_id = ?
  `).all(req.params.id);
  res.json(bl);
});

// POST /api/bons-livraison - reception sur un bon de commande
// lignes: [{ bon_commande_ligne_id, quantite_recue, quantite_acceptee }]
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { bon_commande_id, lignes, notes } = req.body;
  if (!bon_commande_id || !Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ error: 'bon_commande_id et au moins une ligne recue sont requis' });
  }

  const bc = db.prepare('SELECT * FROM bons_commande WHERE id = ?').get(bon_commande_id);
  if (!bc) return res.status(404).json({ error: 'Bon de commande introuvable' });

  const reference = genRef();
  const blInfo = db.prepare('INSERT INTO bons_livraison (reference, bon_commande_id, notes) VALUES (?, ?, ?)')
    .run(reference, bon_commande_id, notes || null);

  const insertLigne = db.prepare('INSERT INTO bon_livraison_lignes (bon_livraison_id, bon_commande_ligne_id, quantite_recue, quantite_acceptee) VALUES (?, ?, ?, ?)');
  const updateQteRecue = db.prepare('UPDATE bon_commande_lignes SET quantite_recue = quantite_recue + ? WHERE id = ?');

  for (const l of lignes) {
    insertLigne.run(blInfo.lastInsertRowid, l.bon_commande_ligne_id, l.quantite_recue || 0, l.quantite_acceptee ?? l.quantite_recue ?? 0);
    updateQteRecue.run(l.quantite_acceptee ?? l.quantite_recue ?? 0, l.bon_commande_ligne_id);
  }

  // recalcul du statut du BC : totalement recu si toutes les lignes sont completes
  const toutesLignes = db.prepare('SELECT quantite, quantite_recue FROM bon_commande_lignes WHERE bon_commande_id = ?').all(bon_commande_id);
  const toutesCompletes = toutesLignes.every((l) => l.quantite_recue >= l.quantite);
  const auMoinsUne = toutesLignes.some((l) => l.quantite_recue > 0);
  const nouveauStatut = toutesCompletes ? 'totalement_recu' : auMoinsUne ? 'partiellement_recu' : bc.statut;
  db.prepare('UPDATE bons_commande SET statut = ? WHERE id = ?').run(nouveauStatut, bon_commande_id);

  res.status(201).json(db.prepare('SELECT * FROM bons_livraison WHERE id = ?').get(blInfo.lastInsertRowid));
});

module.exports = router;
