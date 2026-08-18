const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM contrats').get().c + 1;
  return `CTR-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/contrats?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  const rows = projet_id
    ? db.prepare('SELECT * FROM contrats WHERE projet_id = ? ORDER BY version DESC').all(projet_id)
    : db.prepare(`SELECT c.*, p.nom AS projet_nom FROM contrats c JOIN projets p ON p.id = c.projet_id ORDER BY c.date_signature DESC`).all();
  res.json(rows);
});

// GET /api/contrats/:id
router.get('/:id', (req, res) => {
  const contrat = db.prepare('SELECT * FROM contrats WHERE id = ?').get(req.params.id);
  if (!contrat) return res.status(404).json({ error: 'Contrat introuvable' });
  contrat.lignes = db.prepare('SELECT * FROM contrat_lignes WHERE contrat_id = ?').all(req.params.id);
  contrat.montant_total = contrat.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
  res.json(contrat);
});

// POST /api/contrats - creation manuelle (hors circuit appel d'offre)
router.post('/', requireRole('admin', 'chef_projet'), (req, res) => {
  const { projet_id, taux_retenue_garantie, taux_compte_prorata, taux_finition, date_signature, lignes, notes } = req.body;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });

  const lastVersion = db.prepare('SELECT MAX(version) AS v FROM contrats WHERE projet_id = ?').get(projet_id);
  const version = (lastVersion.v || 0) + 1;
  const reference = genRef();

  const info = db.prepare(`
    INSERT INTO contrats (reference, projet_id, version, taux_retenue_garantie, taux_compte_prorata, taux_finition, date_signature, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference, projet_id, version, taux_retenue_garantie || 0, taux_compte_prorata || 0, taux_finition || 0, date_signature || null, notes || null);

  if (Array.isArray(lignes)) {
    const insertLigne = db.prepare('INSERT INTO contrat_lignes (contrat_id, designation, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?)');
    for (const l of lignes) insertLigne.run(info.lastInsertRowid, l.designation, l.unite || 'u', l.quantite || 0, l.prix_unitaire || 0);
  }

  res.status(201).json(db.prepare('SELECT * FROM contrats WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/contrats/:id/valider
router.put('/:id/valider', requireRole('admin', 'direction'), (req, res) => {
  const result = db.prepare("UPDATE contrats SET statut = 'valide' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);
  if (result.changes === 0) return res.status(400).json({ error: 'Contrat introuvable ou deja valide' });
  res.json(db.prepare('SELECT * FROM contrats WHERE id = ?').get(req.params.id));
});

module.exports = router;
