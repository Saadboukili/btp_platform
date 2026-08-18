const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/attachements?contrat_id=
router.get('/', (req, res) => {
  const { contrat_id } = req.query;
  if (!contrat_id) return res.status(400).json({ error: 'contrat_id requis' });
  res.json(db.prepare('SELECT * FROM attachements WHERE contrat_id = ? ORDER BY numero DESC').all(contrat_id));
});

// GET /api/attachements/:id
router.get('/:id', (req, res) => {
  const att = db.prepare('SELECT * FROM attachements WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Attachement introuvable' });
  att.lignes = db.prepare(`
    SELECT al.*, cl.designation, cl.unite, cl.prix_unitaire, cl.quantite AS quantite_marche
    FROM attachement_lignes al JOIN contrat_lignes cl ON cl.id = al.contrat_ligne_id
    WHERE al.attachement_id = ?
  `).all(req.params.id);
  res.json(att);
});

// POST /api/attachements - constat d'avancement periodique
// lignes: [{ contrat_ligne_id, quantite_cumulee }] -- quantites CUMULEES depuis le debut du chantier
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux', 'metreur'), (req, res) => {
  const { contrat_id, lignes, notes } = req.body;
  if (!contrat_id || !Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ error: 'contrat_id et au moins une ligne sont requis' });
  }

  const lastNum = db.prepare('SELECT MAX(numero) AS n FROM attachements WHERE contrat_id = ?').get(contrat_id);
  const numero = (lastNum.n || 0) + 1;

  const attInfo = db.prepare('INSERT INTO attachements (contrat_id, numero, notes) VALUES (?, ?, ?)').run(contrat_id, numero, notes || null);

  const insertLigne = db.prepare('INSERT INTO attachement_lignes (attachement_id, contrat_ligne_id, quantite_cumulee, montant_cumule) VALUES (?, ?, ?, ?)');
  for (const l of lignes) {
    const contratLigne = db.prepare('SELECT * FROM contrat_lignes WHERE id = ?').get(l.contrat_ligne_id);
    if (!contratLigne) continue;
    const montantCumule = (l.quantite_cumulee || 0) * contratLigne.prix_unitaire;
    insertLigne.run(attInfo.lastInsertRowid, l.contrat_ligne_id, l.quantite_cumulee || 0, montantCumule);
  }

  res.status(201).json(db.prepare('SELECT * FROM attachements WHERE id = ?').get(attInfo.lastInsertRowid));
});

// PUT /api/attachements/:id/valider
router.put('/:id/valider', requireRole('admin', 'chef_projet'), (req, res) => {
  const result = db.prepare("UPDATE attachements SET statut = 'valide' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);
  if (result.changes === 0) return res.status(400).json({ error: 'Attachement introuvable ou deja valide' });
  res.json(db.prepare('SELECT * FROM attachements WHERE id = ?').get(req.params.id));
});

module.exports = router;
