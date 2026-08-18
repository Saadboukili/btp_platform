const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genRef() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM consultations_sous_traitance').get().c + 1;
  return `CONS-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

function genRefContrat() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM contrats_sous_traitance').get().c + 1;
  return `CST-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/consultations-sous-traitance?projet_id=&statut=
router.get('/', (req, res) => {
  const { projet_id, statut } = req.query;
  let query = `SELECT c.*, p.nom AS projet_nom FROM consultations_sous_traitance c JOIN projets p ON p.id = c.projet_id WHERE 1=1`;
  const params = [];
  if (projet_id) { query += ' AND c.projet_id = ?'; params.push(projet_id); }
  if (statut) { query += ' AND c.statut = ?'; params.push(statut); }
  query += ' ORDER BY c.date_creation DESC';

  const consultations = db.prepare(query).all(...params);
  for (const c of consultations) {
    const t = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN statut = 'repondu' THEN 1 ELSE 0 END) AS repondu FROM consultation_participants WHERE consultation_id = ?").get(c.id);
    c.nb_participants = t.total;
    c.nb_reponses = t.repondu || 0;
  }
  res.json(consultations);
});

// GET /api/consultations-sous-traitance/:id
router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM consultations_sous_traitance WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Consultation introuvable' });
  c.participants = db.prepare(`
    SELECT cp.*, t.nom AS sous_traitant_nom, t.email AS sous_traitant_email
    FROM consultation_participants cp JOIN tiers t ON t.id = cp.sous_traitant_id
    WHERE cp.consultation_id = ? ORDER BY cp.montant_propose IS NULL, cp.montant_propose ASC
  `).all(req.params.id);
  res.json(c);
});

// POST /api/consultations-sous-traitance - creation, avec liste de sous-traitants a consulter
router.post('/', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { projet_id, nature_travaux, description, date_limite_reponse, sous_traitant_ids } = req.body;
  if (!projet_id || !nature_travaux) return res.status(400).json({ error: 'projet_id et nature_travaux requis' });

  const reference = genRef();
  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO consultations_sous_traitance (reference, projet_id, nature_travaux, description, date_limite_reponse, statut)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reference, projet_id, nature_travaux, description || null, date_limite_reponse || null, Array.isArray(sous_traitant_ids) && sous_traitant_ids.length > 0 ? 'envoyee' : 'brouillon');

    if (Array.isArray(sous_traitant_ids)) {
      const insertParticipant = db.prepare('INSERT INTO consultation_participants (consultation_id, sous_traitant_id) VALUES (?, ?)');
      for (const stId of sous_traitant_ids) insertParticipant.run(info.lastInsertRowid, stId);
    }
    return info.lastInsertRowid;
  });

  const id = transaction();
  const result = db.prepare('SELECT * FROM consultations_sous_traitance WHERE id = ?').get(id);
  result.participants = db.prepare('SELECT * FROM consultation_participants WHERE consultation_id = ?').all(id);
  res.status(201).json(result);
});

// POST /api/consultations-sous-traitance/:id/participants - inviter un sous-traitant supplementaire
router.post('/:id/participants', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { sous_traitant_id } = req.body;
  if (!sous_traitant_id) return res.status(400).json({ error: 'sous_traitant_id requis' });

  const info = db.prepare('INSERT INTO consultation_participants (consultation_id, sous_traitant_id) VALUES (?, ?)').run(req.params.id, sous_traitant_id);
  db.prepare("UPDATE consultations_sous_traitance SET statut = 'envoyee' WHERE id = ? AND statut = 'brouillon'").run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM consultation_participants WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/consultations-sous-traitance/participants/:id - enregistrer la reponse du sous-traitant (offre ou declin)
router.put('/participants/:id', requireRole('admin', 'chef_projet', 'conducteur_travaux'), (req, res) => {
  const { montant_propose, delai_propose_jours, statut, notes } = req.body;
  if (!['repondu', 'decline'].includes(statut)) return res.status(400).json({ error: "statut doit etre 'repondu' ou 'decline'" });
  if (statut === 'repondu' && !montant_propose) return res.status(400).json({ error: 'montant_propose requis si le sous-traitant repond' });

  db.prepare(`
    UPDATE consultation_participants SET statut = ?, montant_propose = ?, delai_propose_jours = ?, notes = ?, date_reponse = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(statut, montant_propose || null, delai_propose_jours || null, notes || null, req.params.id);

  res.json(db.prepare('SELECT * FROM consultation_participants WHERE id = ?').get(req.params.id));
});

// PUT /api/consultations-sous-traitance/:id/cloturer - plus aucune reponse acceptee, prete pour adjudication
router.put('/:id/cloturer', requireRole('admin', 'chef_projet'), (req, res) => {
  const result = db.prepare("UPDATE consultations_sous_traitance SET statut = 'cloturee' WHERE id = ? AND statut = 'envoyee'").run(req.params.id);
  if (result.changes === 0) return res.status(400).json({ error: 'Consultation introuvable ou pas au statut envoyee' });
  res.json(db.prepare('SELECT * FROM consultations_sous_traitance WHERE id = ?').get(req.params.id));
});

// PUT /api/consultations-sous-traitance/:id/adjuger - choisir le sous-traitant gagnant, cree le contrat de sous-traitance
router.put('/:id/adjuger', requireRole('admin', 'chef_projet', 'direction'), (req, res) => {
  const { participant_id, taux_retenue_garantie } = req.body;
  if (!participant_id) return res.status(400).json({ error: 'participant_id (gagnant) requis' });

  const consultation = db.prepare('SELECT * FROM consultations_sous_traitance WHERE id = ?').get(req.params.id);
  if (!consultation) return res.status(404).json({ error: 'Consultation introuvable' });
  if (consultation.statut === 'adjugee') return res.status(400).json({ error: 'Cette consultation est deja adjugee' });

  const gagnant = db.prepare('SELECT * FROM consultation_participants WHERE id = ? AND consultation_id = ?').get(participant_id, req.params.id);
  if (!gagnant) return res.status(404).json({ error: 'Participant introuvable pour cette consultation' });
  if (gagnant.statut !== 'repondu') return res.status(400).json({ error: 'Ce participant n\'a pas soumis d\'offre' });

  const transaction = db.transaction(() => {
    const reference = genRefContrat();
    const contratInfo = db.prepare(`
      INSERT INTO contrats_sous_traitance (reference, projet_id, sous_traitant_id, nature_travaux, montant_total, taux_retenue_garantie, statut)
      VALUES (?, ?, ?, ?, ?, ?, 'en_cours')
    `).run(reference, consultation.projet_id, gagnant.sous_traitant_id, consultation.nature_travaux, gagnant.montant_propose, taux_retenue_garantie || 0);

    db.prepare("UPDATE consultation_participants SET statut = 'retenu' WHERE id = ?").run(participant_id);
    db.prepare("UPDATE consultation_participants SET statut = 'non_retenu' WHERE consultation_id = ? AND id != ? AND statut = 'repondu'").run(req.params.id, participant_id);
    db.prepare("UPDATE consultations_sous_traitance SET statut = 'adjugee' WHERE id = ?").run(req.params.id);

    return contratInfo.lastInsertRowid;
  });

  const contratId = transaction();
  res.json({
    consultation: db.prepare('SELECT * FROM consultations_sous_traitance WHERE id = ?').get(req.params.id),
    contrat: db.prepare('SELECT * FROM contrats_sous_traitance WHERE id = ?').get(contratId),
  });
});

module.exports = router;
