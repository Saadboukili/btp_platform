const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM importations').get().c + 1;
  return `IMP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

function calculerCoutRevient(imp) {
  const montantMarchandise = imp.montant_marchandise_devise * imp.taux_change;
  const totalFrais = imp.frais_transport + imp.frais_douane + imp.frais_assurance + imp.frais_transit;
  return {
    montant_marchandise_mad: Math.round(montantMarchandise * 100) / 100,
    total_frais: Math.round(totalFrais * 100) / 100,
    cout_revient_total: Math.round((montantMarchandise + totalFrais) * 100) / 100,
  };
}

// GET /api/importations
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT i.*, t.nom AS fournisseur_nom, p.nom AS projet_nom FROM importations i
    LEFT JOIN tiers t ON t.id = i.fournisseur_id LEFT JOIN projets p ON p.id = i.projet_id
    ORDER BY i.date_creation DESC
  `).all();
  for (const r of rows) Object.assign(r, calculerCoutRevient(r));
  res.json(rows);
});

// GET /api/importations/:id
router.get('/:id', (req, res) => {
  const imp = db.prepare(`
    SELECT i.*, t.nom AS fournisseur_nom, p.nom AS projet_nom FROM importations i
    LEFT JOIN tiers t ON t.id = i.fournisseur_id LEFT JOIN projets p ON p.id = i.projet_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!imp) return res.status(404).json({ error: 'Importation introuvable' });
  Object.assign(imp, calculerCoutRevient(imp));
  res.json(imp);
});

// POST /api/importations
router.post('/', requireRole('admin', 'acheteur', 'chef_projet'), (req, res) => {
  const { projet_id, fournisseur_id, devise, taux_change, incoterm, montant_marchandise_devise, frais_transport, frais_douane, frais_assurance, frais_transit, notes } = req.body;
  if (!montant_marchandise_devise) return res.status(400).json({ error: 'montant_marchandise_devise requis' });

  const reference = genRef();
  const info = db.prepare(`
    INSERT INTO importations (reference, projet_id, fournisseur_id, devise, taux_change, incoterm, montant_marchandise_devise, frais_transport, frais_douane, frais_assurance, frais_transit, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference, projet_id || null, fournisseur_id || null, devise || 'EUR', taux_change || 1, incoterm || null,
    montant_marchandise_devise, frais_transport || 0, frais_douane || 0, frais_assurance || 0, frais_transit || 0, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM importations WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/importations/:id
router.put('/:id', requireRole('admin', 'acheteur', 'chef_projet'), (req, res) => {
  const fields = ['fournisseur_id', 'devise', 'taux_change', 'incoterm', 'montant_marchandise_devise', 'frais_transport', 'frais_douane', 'frais_assurance', 'frais_transit', 'statut', 'notes'];
  const updates = fields.filter((f) => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee' });
  db.prepare(`UPDATE importations SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`).run(...updates.map((f) => req.body[f]), req.params.id);
  res.json(db.prepare('SELECT * FROM importations WHERE id = ?').get(req.params.id));
});

module.exports = router;
