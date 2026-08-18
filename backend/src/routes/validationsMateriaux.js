const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const ETAPES_DEFAUT = ['client', 'architecte', 'bureau_etudes', 'achats'];
const LABEL_ETAPE = { client: 'Client', architecte: 'Architecte', bureau_etudes: 'Bureau d\'etudes', achats: 'Achats' };

// GET /api/validations-materiaux?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  const rows = projet_id
    ? db.prepare('SELECT * FROM validations_materiaux WHERE projet_id = ? ORDER BY date_creation DESC').all(projet_id)
    : db.prepare(`SELECT v.*, p.nom AS projet_nom FROM validations_materiaux v JOIN projets p ON p.id = v.projet_id ORDER BY v.date_creation DESC`).all();

  for (const v of rows) {
    v.etapes = db.prepare('SELECT * FROM validation_materiaux_etapes WHERE validation_id = ? ORDER BY ordre').all(v.id);
  }
  res.json(rows);
});

// GET /api/validations-materiaux/:id
router.get('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM validations_materiaux WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Validation introuvable' });
  v.etapes = db.prepare('SELECT * FROM validation_materiaux_etapes WHERE validation_id = ? ORDER BY ordre').all(req.params.id);
  res.json(v);
});

// POST /api/validations-materiaux - soumission d'un materiau au circuit de validation
router.post('/', (req, res) => {
  const { projet_id, designation, fournisseur_suggere, etapes } = req.body;
  if (!projet_id || !designation) return res.status(400).json({ error: 'projet_id et designation requis' });

  const sequence = Array.isArray(etapes) && etapes.length > 0 ? etapes : ETAPES_DEFAUT;
  const invalides = sequence.filter((e) => !ETAPES_DEFAUT.includes(e));
  if (invalides.length > 0) return res.status(400).json({ error: `Etapes invalides: ${invalides.join(', ')}` });

  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO validations_materiaux (projet_id, designation, fournisseur_suggere, demandeur_id)
      VALUES (?, ?, ?, ?)
    `).run(projet_id, designation, fournisseur_suggere || null, req.user.id);

    const insertEtape = db.prepare('INSERT INTO validation_materiaux_etapes (validation_id, etape, ordre) VALUES (?, ?, ?)');
    sequence.forEach((etape, idx) => insertEtape.run(info.lastInsertRowid, etape, idx + 1));

    return info.lastInsertRowid;
  });

  const id = transaction();
  const result = db.prepare('SELECT * FROM validations_materiaux WHERE id = ?').get(id);
  result.etapes = db.prepare('SELECT * FROM validation_materiaux_etapes WHERE validation_id = ? ORDER BY ordre').all(id);
  res.status(201).json(result);
});

// PUT /api/validations-materiaux/etapes/:etapeId - traiter l'etape courante (approuver ou rejeter)
router.put('/etapes/:etapeId', (req, res) => {
  const { statut, commentaire } = req.body;
  if (!['approuve', 'rejete'].includes(statut)) return res.status(400).json({ error: "statut doit etre 'approuve' ou 'rejete'" });

  const etape = db.prepare('SELECT * FROM validation_materiaux_etapes WHERE id = ?').get(req.params.etapeId);
  if (!etape) return res.status(404).json({ error: 'Etape introuvable' });
  if (etape.statut !== 'en_attente') return res.status(400).json({ error: 'Cette etape a deja ete traitee' });

  // l'etape ne peut etre traitee que si toutes les etapes precedentes sont approuvees
  const etapesPrecedentes = db.prepare(`
    SELECT COUNT(*) AS c FROM validation_materiaux_etapes
    WHERE validation_id = ? AND ordre < ? AND statut != 'approuve'
  `).get(etape.validation_id, etape.ordre).c;
  if (etapesPrecedentes > 0) return res.status(400).json({ error: 'Les etapes precedentes ne sont pas encore toutes approuvees' });

  const transaction = db.transaction(() => {
    db.prepare("UPDATE validation_materiaux_etapes SET statut = ?, commentaire = ?, date_traitement = CURRENT_TIMESTAMP WHERE id = ?")
      .run(statut, commentaire || null, req.params.etapeId);

    if (statut === 'rejete') {
      db.prepare("UPDATE validations_materiaux SET statut = 'rejete' WHERE id = ?").run(etape.validation_id);
    } else {
      const restantes = db.prepare(`
        SELECT COUNT(*) AS c FROM validation_materiaux_etapes WHERE validation_id = ? AND statut = 'en_attente'
      `).get(etape.validation_id).c;
      if (restantes === 0) {
        db.prepare("UPDATE validations_materiaux SET statut = 'approuve' WHERE id = ?").run(etape.validation_id);
      }
    }
  });
  transaction();

  const result = db.prepare('SELECT * FROM validations_materiaux WHERE id = ?').get(etape.validation_id);
  result.etapes = db.prepare('SELECT * FROM validation_materiaux_etapes WHERE validation_id = ? ORDER BY ordre').all(etape.validation_id);
  res.json(result);
});

module.exports = router;
