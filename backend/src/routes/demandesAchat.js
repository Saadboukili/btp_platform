const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef(table, prefix) {
  const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c + 1;
  return `${prefix}-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/demandes-achat?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  const rows = projet_id
    ? db.prepare(`
        SELECT d.*, u.nom AS demandeur_nom, v.nom AS valide_par_nom
        FROM demandes_achat d LEFT JOIN utilisateurs u ON u.id = d.demandeur_id LEFT JOIN utilisateurs v ON v.id = d.valide_par
        WHERE d.projet_id = ? ORDER BY d.date_demande DESC
      `).all(projet_id)
    : db.prepare(`
        SELECT d.*, u.nom AS demandeur_nom, v.nom AS valide_par_nom, p.nom AS projet_nom
        FROM demandes_achat d LEFT JOIN utilisateurs u ON u.id = d.demandeur_id LEFT JOIN utilisateurs v ON v.id = d.valide_par
        LEFT JOIN projets p ON p.id = d.projet_id ORDER BY d.date_demande DESC
      `).all();
  res.json(rows);
});

// GET /api/demandes-achat/:id
router.get('/:id', (req, res) => {
  const demande = db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
  demande.lignes = db.prepare('SELECT * FROM demande_achat_lignes WHERE demande_id = ?').all(req.params.id);
  res.json(demande);
});

// POST /api/demandes-achat - creation par le demandeur ("pointeur"/conducteur de travaux/etc.)
router.post('/', (req, res) => {
  const { projet_id, commentaire, lignes, soumettre } = req.body;
  if (!projet_id || !Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ error: 'projet_id et au moins une ligne sont requis' });
  }

  const reference = genRef('demandes_achat', 'DA');
  const statut = soumettre ? 'en_attente' : 'brouillon';
  const info = db.prepare(`
    INSERT INTO demandes_achat (reference, projet_id, demandeur_id, statut, commentaire)
    VALUES (?, ?, ?, ?, ?)
  `).run(reference, projet_id, req.user.id, statut, commentaire || null);

  const insertLigne = db.prepare('INSERT INTO demande_achat_lignes (demande_id, designation, unite, quantite) VALUES (?, ?, ?, ?)');
  for (const l of lignes) insertLigne.run(info.lastInsertRowid, l.designation, l.unite || 'u', l.quantite || 0);

  res.status(201).json(db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/demandes-achat/:id/soumettre - brouillon -> en_attente
router.put('/:id/soumettre', (req, res) => {
  const result = db.prepare("UPDATE demandes_achat SET statut = 'en_attente' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);
  if (result.changes === 0) return res.status(400).json({ error: 'Demande introuvable ou deja soumise' });
  res.json(db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id));
});

// PUT /api/demandes-achat/:id/valider - reserve au chef de projet (ou admin) : validation de l'opportunite de l'achat
router.put('/:id/valider', requireRole('admin', 'chef_projet'), (req, res) => {
  const demande = db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
  if (demande.statut !== 'en_attente') return res.status(400).json({ error: 'Seule une demande en attente peut etre validee' });

  db.prepare("UPDATE demandes_achat SET statut = 'validee', valide_par = ? WHERE id = ?").run(req.user.id, req.params.id);
  res.json(db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id));
});

// PUT /api/demandes-achat/:id/rejeter - chef de projet ou admin, a n'importe quelle etape avant generation du BC
router.put('/:id/rejeter', requireRole('admin', 'chef_projet'), (req, res) => {
  const demande = db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
  if (demande.statut === 'bon_commande_genere') return res.status(400).json({ error: 'Le bon de commande a deja ete genere, impossible de rejeter' });

  db.prepare("UPDATE demandes_achat SET statut = 'rejetee', commentaire = COALESCE(?, commentaire) WHERE id = ?")
    .run(req.body.commentaire || null, req.params.id);
  res.json(db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id));
});

// PUT /api/demandes-achat/:id/generer-bc - reserve a l'acheteur (ou admin)
// Cree le bon de commande pre-rempli a partir des lignes de la demande validee
router.put('/:id/generer-bc', requireRole('admin', 'acheteur'), (req, res) => {
  const demande = db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id);
  if (!demande) return res.status(404).json({ error: 'Demande introuvable' });
  if (demande.statut !== 'validee') return res.status(400).json({ error: 'Seule une demande validee par le chef de projet peut generer un bon de commande' });

  const lignes = db.prepare('SELECT * FROM demande_achat_lignes WHERE demande_id = ?').all(req.params.id);

  const referenceBC = genRef('bons_commande', 'BC');
  const bcInfo = db.prepare(`
    INSERT INTO bons_commande (reference, projet_id, demande_achat_id, statut, notes)
    VALUES (?, ?, ?, 'brouillon', ?)
  `).run(referenceBC, demande.projet_id, demande.id, `Genere depuis la demande ${demande.reference} - fournisseur et prix a completer`);

  const insertLigneBC = db.prepare('INSERT INTO bon_commande_lignes (bon_commande_id, designation, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, 0)');
  for (const l of lignes) insertLigneBC.run(bcInfo.lastInsertRowid, l.designation, l.unite, l.quantite);

  db.prepare("UPDATE demandes_achat SET statut = 'bon_commande_genere', bon_commande_id = ?, bc_genere_par = ? WHERE id = ?")
    .run(bcInfo.lastInsertRowid, req.user.id, req.params.id);

  const result = db.prepare('SELECT * FROM demandes_achat WHERE id = ?').get(req.params.id);
  result.bon_commande = db.prepare('SELECT * FROM bons_commande WHERE id = ?').get(bcInfo.lastInsertRowid);
  res.json(result);
});

module.exports = router;
