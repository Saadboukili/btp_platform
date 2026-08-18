const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM decomptes').get().c + 1;
  return `DEC-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/decomptes?contrat_id=
router.get('/', (req, res) => {
  const { contrat_id } = req.query;
  let query = `SELECT d.*, a.numero AS attachement_numero, a.contrat_id FROM decomptes d JOIN attachements a ON a.id = d.attachement_id`;
  const params = [];
  if (contrat_id) { query += ' WHERE a.contrat_id = ?'; params.push(contrat_id); }
  query += ' ORDER BY d.date_creation DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/decomptes/:id
router.get('/:id', (req, res) => {
  const dec = db.prepare('SELECT * FROM decomptes WHERE id = ?').get(req.params.id);
  if (!dec) return res.status(404).json({ error: 'Decompte introuvable' });
  res.json(dec);
});

// POST /api/decomptes - genere le decompte a partir d'un attachement valide
// Le montant du decompte = increment par rapport a l'attachement precedent du meme contrat (facturation a l'avancement)
router.post('/', requireRole('admin', 'chef_projet', 'comptable'), (req, res) => {
  const { attachement_id, taux_tva } = req.body;
  if (!attachement_id) return res.status(400).json({ error: 'attachement_id requis' });

  const attachement = db.prepare('SELECT * FROM attachements WHERE id = ?').get(attachement_id);
  if (!attachement) return res.status(404).json({ error: 'Attachement introuvable' });
  if (attachement.statut !== 'valide') return res.status(400).json({ error: 'L\'attachement doit etre valide avant de generer un decompte' });

  const dejaGenere = db.prepare('SELECT id FROM decomptes WHERE attachement_id = ?').get(attachement_id);
  if (dejaGenere) return res.status(400).json({ error: 'Un decompte existe deja pour cet attachement' });

  const contrat = db.prepare('SELECT * FROM contrats WHERE id = ?').get(attachement.contrat_id);
  const lignesActuelles = db.prepare('SELECT * FROM attachement_lignes WHERE attachement_id = ?').all(attachement_id);

  // attachement precedent valide (numero le plus proche inferieur) pour calculer l'incrément
  const precedent = db.prepare(`
    SELECT * FROM attachements WHERE contrat_id = ? AND numero < ? AND statut = 'valide' ORDER BY numero DESC LIMIT 1
  `).get(attachement.contrat_id, attachement.numero);

  let montantPrecedent = 0;
  if (precedent) {
    const t = db.prepare('SELECT SUM(montant_cumule) AS t FROM attachement_lignes WHERE attachement_id = ?').get(precedent.id);
    montantPrecedent = t.t || 0;
  }

  const montantActuel = lignesActuelles.reduce((s, l) => s + l.montant_cumule, 0);
  const montantBrut = Math.max(0, montantActuel - montantPrecedent);

  const tva = taux_tva ?? 20;
  const tauxRetenueTotal = (contrat.taux_retenue_garantie || 0) + (contrat.taux_compte_prorata || 0) + (contrat.taux_finition || 0);
  const montantRetenues = montantBrut * (tauxRetenueTotal / 100);
  const netAPayer = montantBrut - montantRetenues + montantBrut * (tva / 100);

  const reference = genRef();
  const info = db.prepare(`
    INSERT INTO decomptes (reference, attachement_id, montant_brut, taux_tva, montant_retenues, net_a_payer)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(reference, attachement_id, montantBrut, tva, montantRetenues, netAPayer);

  res.status(201).json(db.prepare('SELECT * FROM decomptes WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/decomptes/:id/valider
router.put('/:id/valider', requireRole('admin', 'chef_projet', 'comptable'), (req, res) => {
  const result = db.prepare("UPDATE decomptes SET statut = 'valide' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);
  if (result.changes === 0) return res.status(400).json({ error: 'Decompte introuvable ou deja valide' });
  res.json(db.prepare('SELECT * FROM decomptes WHERE id = ?').get(req.params.id));
});

module.exports = router;
