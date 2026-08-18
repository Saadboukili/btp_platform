const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function ajusterNiveau(produitId, entrepotId, delta) {
  const existe = db.prepare('SELECT * FROM stock_niveaux WHERE produit_id = ? AND entrepot_id = ?').get(produitId, entrepotId);
  if (existe) {
    db.prepare('UPDATE stock_niveaux SET quantite = quantite + ? WHERE id = ?').run(delta, existe.id);
  } else {
    db.prepare('INSERT INTO stock_niveaux (produit_id, entrepot_id, quantite) VALUES (?, ?, ?)').run(produitId, entrepotId, delta);
  }
}

// GET /api/stock/niveaux?entrepot_id=
router.get('/niveaux', (req, res) => {
  const { entrepot_id } = req.query;
  let query = `
    SELECT sn.*, p.designation, p.reference, p.unite, p.seuil_alerte, e.nom AS entrepot_nom
    FROM stock_niveaux sn JOIN produits p ON p.id = sn.produit_id JOIN entrepots e ON e.id = sn.entrepot_id
    WHERE 1=1
  `;
  const params = [];
  if (entrepot_id) { query += ' AND sn.entrepot_id = ?'; params.push(entrepot_id); }
  query += ' ORDER BY p.designation';
  const niveaux = db.prepare(query).all(...params);
  for (const n of niveaux) n.en_alerte = n.seuil_alerte > 0 && n.quantite <= n.seuil_alerte;
  res.json(niveaux);
});

// GET /api/stock/mouvements?produit_id=&entrepot_id=&type=
router.get('/mouvements', (req, res) => {
  const { produit_id, type } = req.query;
  let query = `
    SELECT sm.*, p.designation, es.nom AS entrepot_source_nom, ed.nom AS entrepot_destination_nom, u.nom AS saisie_par_nom
    FROM stock_mouvements sm JOIN produits p ON p.id = sm.produit_id
    LEFT JOIN entrepots es ON es.id = sm.entrepot_source_id
    LEFT JOIN entrepots ed ON ed.id = sm.entrepot_destination_id
    LEFT JOIN utilisateurs u ON u.id = sm.saisie_par
    WHERE 1=1
  `;
  const params = [];
  if (produit_id) { query += ' AND sm.produit_id = ?'; params.push(produit_id); }
  if (type) { query += ' AND sm.type = ?'; params.push(type); }
  query += ' ORDER BY sm.date_mouvement DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/stock/mouvements - entree, sortie ou transfert
router.post('/mouvements', requirePermission('stock', 'creer'), (req, res) => {
  const { produit_id, type, entrepot_source_id, entrepot_destination_id, quantite, motif } = req.body;
  if (!produit_id || !type || !quantite) return res.status(400).json({ error: 'produit_id, type et quantite sont requis' });
  if (type === 'entree' && !entrepot_destination_id) return res.status(400).json({ error: 'entrepot_destination_id requis pour une entree' });
  if (type === 'sortie' && !entrepot_source_id) return res.status(400).json({ error: 'entrepot_source_id requis pour une sortie' });
  if (type === 'transfert' && (!entrepot_source_id || !entrepot_destination_id)) return res.status(400).json({ error: 'entrepot_source_id et entrepot_destination_id requis pour un transfert' });

  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO stock_mouvements (produit_id, type, entrepot_source_id, entrepot_destination_id, quantite, motif, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(produit_id, type, entrepot_source_id || null, entrepot_destination_id || null, quantite, motif || null, req.user.id);

    if (type === 'entree') ajusterNiveau(produit_id, entrepot_destination_id, quantite);
    if (type === 'sortie') ajusterNiveau(produit_id, entrepot_source_id, -quantite);
    if (type === 'transfert') {
      ajusterNiveau(produit_id, entrepot_source_id, -quantite);
      ajusterNiveau(produit_id, entrepot_destination_id, quantite);
    }
    return info.lastInsertRowid;
  });

  const id = transaction();
  res.status(201).json(db.prepare('SELECT * FROM stock_mouvements WHERE id = ?').get(id));
});

// ===== INVENTAIRES =====

// GET /api/stock/inventaires?entrepot_id=
router.get('/inventaires', (req, res) => {
  const { entrepot_id } = req.query;
  let query = `SELECT i.*, e.nom AS entrepot_nom FROM inventaires i JOIN entrepots e ON e.id = i.entrepot_id WHERE 1=1`;
  const params = [];
  if (entrepot_id) { query += ' AND i.entrepot_id = ?'; params.push(entrepot_id); }
  query += ' ORDER BY i.date_creation DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/stock/inventaires - ouvre un inventaire, pre-rempli avec le stock theorique actuel
router.post('/inventaires', requirePermission('stock', 'creer'), (req, res) => {
  const { entrepot_id } = req.body;
  if (!entrepot_id) return res.status(400).json({ error: 'entrepot_id requis' });

  const count = db.prepare('SELECT COUNT(*) AS c FROM inventaires').get().c + 1;
  const reference = `INV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const transaction = db.transaction(() => {
    const info = db.prepare('INSERT INTO inventaires (reference, entrepot_id) VALUES (?, ?)').run(reference, entrepot_id);
    const niveaux = db.prepare('SELECT produit_id, quantite FROM stock_niveaux WHERE entrepot_id = ?').all(entrepot_id);
    const insertLigne = db.prepare('INSERT INTO inventaire_lignes (inventaire_id, produit_id, quantite_theorique) VALUES (?, ?, ?)');
    for (const n of niveaux) insertLigne.run(info.lastInsertRowid, n.produit_id, n.quantite);
    return info.lastInsertRowid;
  });

  const id = transaction();
  const result = db.prepare('SELECT * FROM inventaires WHERE id = ?').get(id);
  result.lignes = db.prepare('SELECT il.*, p.designation, p.unite FROM inventaire_lignes il JOIN produits p ON p.id = il.produit_id WHERE inventaire_id = ?').all(id);
  res.status(201).json(result);
});

// GET /api/stock/inventaires/:id
router.get('/inventaires/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM inventaires WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Inventaire introuvable' });
  inv.lignes = db.prepare('SELECT il.*, p.designation, p.unite FROM inventaire_lignes il JOIN produits p ON p.id = il.produit_id WHERE inventaire_id = ?').all(req.params.id);
  res.json(inv);
});

// PUT /api/stock/inventaires/lignes/:id - saisir la quantite comptee
router.put('/inventaires/lignes/:id', requirePermission('stock', 'creer'), (req, res) => {
  const { quantite_comptee } = req.body;
  if (quantite_comptee === undefined) return res.status(400).json({ error: 'quantite_comptee requise' });
  db.prepare('UPDATE inventaire_lignes SET quantite_comptee = ? WHERE id = ?').run(quantite_comptee, req.params.id);
  res.json(db.prepare('SELECT * FROM inventaire_lignes WHERE id = ?').get(req.params.id));
});

// PUT /api/stock/inventaires/:id/cloturer - applique les ecarts au stock reel
router.put('/inventaires/:id/cloturer', requirePermission('stock', 'valider'), (req, res) => {
  const inv = db.prepare('SELECT * FROM inventaires WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Inventaire introuvable' });
  if (inv.statut === 'cloture') return res.status(400).json({ error: 'Cet inventaire est deja cloture' });

  const lignes = db.prepare('SELECT * FROM inventaire_lignes WHERE inventaire_id = ? AND quantite_comptee IS NOT NULL').all(req.params.id);

  const transaction = db.transaction(() => {
    for (const l of lignes) {
      const ecart = l.quantite_comptee - l.quantite_theorique;
      if (ecart !== 0) {
        ajusterNiveau(l.produit_id, inv.entrepot_id, ecart);
        db.prepare(`
          INSERT INTO stock_mouvements (produit_id, type, entrepot_source_id, entrepot_destination_id, quantite, motif, saisie_par)
          VALUES (?, 'inventaire', ?, ?, ?, ?, ?)
        `).run(l.produit_id, ecart < 0 ? inv.entrepot_id : null, ecart > 0 ? inv.entrepot_id : null, Math.abs(ecart), `Regularisation inventaire ${inv.reference}`, req.user.id);
      }
    }
    db.prepare("UPDATE inventaires SET statut = 'cloture', cloture_par = ? WHERE id = ?").run(req.user.id, req.params.id);
  });
  transaction();

  res.json(db.prepare('SELECT * FROM inventaires WHERE id = ?').get(req.params.id));
});

module.exports = router;
