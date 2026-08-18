const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genererNumeroPiece(journalId) {
  const journal = db.prepare('SELECT code FROM journaux WHERE id = ?').get(journalId);
  const count = db.prepare('SELECT COUNT(*) AS c FROM ecritures WHERE journal_id = ?').get(journalId).c + 1;
  return `${journal.code}-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
}

// GET /api/ecritures?journal_id=&exercice_id=&projet_id=
router.get('/', (req, res) => {
  const { journal_id, exercice_id, projet_id } = req.query;
  let query = `
    SELECT e.*, j.code AS journal_code, j.nom AS journal_nom, p.nom AS projet_nom
    FROM ecritures e JOIN journaux j ON j.id = e.journal_id LEFT JOIN projets p ON p.id = e.projet_id
    WHERE 1=1
  `;
  const params = [];
  if (journal_id) { query += ' AND e.journal_id = ?'; params.push(journal_id); }
  if (exercice_id) { query += ' AND e.exercice_id = ?'; params.push(exercice_id); }
  if (projet_id) { query += ' AND e.projet_id = ?'; params.push(projet_id); }
  query += ' ORDER BY e.date_ecriture DESC, e.id DESC';

  const ecritures = db.prepare(query).all(...params);
  for (const e of ecritures) {
    const t = db.prepare('SELECT SUM(debit) AS d, SUM(credit) AS c FROM ecriture_lignes WHERE ecriture_id = ?').get(e.id);
    e.total_debit = t.d || 0;
    e.total_credit = t.c || 0;
  }
  res.json(ecritures);
});

// GET /api/ecritures/:id
router.get('/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM ecritures WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Ecriture introuvable' });
  e.lignes = db.prepare(`
    SELECT el.*, pc.numero AS compte_numero, pc.intitule AS compte_intitule
    FROM ecriture_lignes el JOIN plan_comptable pc ON pc.id = el.compte_id
    WHERE el.ecriture_id = ?
  `).all(req.params.id);
  res.json(e);
});

// POST /api/ecritures - creation en brouillon, avec lignes (doit finir equilibree pour etre validee)
router.post('/', requirePermission('comptabilite', 'creer'), (req, res) => {
  const { journal_id, exercice_id, projet_id, date_ecriture, libelle, lignes } = req.body;
  if (!journal_id || !exercice_id || !date_ecriture || !libelle || !Array.isArray(lignes) || lignes.length < 2) {
    return res.status(400).json({ error: 'journal_id, exercice_id, date_ecriture, libelle et au moins 2 lignes sont requis' });
  }

  const exercice = db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(exercice_id);
  if (!exercice) return res.status(404).json({ error: 'Exercice introuvable' });
  if (exercice.statut === 'cloture') return res.status(400).json({ error: 'Cet exercice est cloture' });

  const numeroPiece = genererNumeroPiece(journal_id);

  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO ecritures (numero_piece, journal_id, exercice_id, projet_id, date_ecriture, libelle, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(numeroPiece, journal_id, exercice_id, projet_id || null, date_ecriture, libelle, req.user.id);

    const insertLigne = db.prepare('INSERT INTO ecriture_lignes (ecriture_id, compte_id, libelle, debit, credit) VALUES (?, ?, ?, ?, ?)');
    for (const l of lignes) insertLigne.run(info.lastInsertRowid, l.compte_id, l.libelle || null, l.debit || 0, l.credit || 0);

    return info.lastInsertRowid;
  });

  const id = transaction();
  const result = db.prepare('SELECT * FROM ecritures WHERE id = ?').get(id);
  result.lignes = db.prepare('SELECT * FROM ecriture_lignes WHERE ecriture_id = ?').all(id);
  res.status(201).json(result);
});

// PUT /api/ecritures/:id/valider - verifie l'equilibre debit = credit avant validation
router.put('/:id/valider', requirePermission('comptabilite', 'valider'), (req, res) => {
  const e = db.prepare('SELECT * FROM ecritures WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Ecriture introuvable' });
  if (e.statut === 'validee') return res.status(400).json({ error: 'Cette ecriture est deja validee' });

  const t = db.prepare('SELECT SUM(debit) AS d, SUM(credit) AS c FROM ecriture_lignes WHERE ecriture_id = ?').get(req.params.id);
  const debit = Math.round((t.d || 0) * 100) / 100;
  const credit = Math.round((t.c || 0) * 100) / 100;
  if (debit !== credit) {
    return res.status(400).json({ error: `Ecriture non equilibree : debit ${debit} != credit ${credit}` });
  }
  if (debit === 0) return res.status(400).json({ error: 'Ecriture vide' });

  db.prepare("UPDATE ecritures SET statut = 'validee' WHERE id = ?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM ecritures WHERE id = ?').get(req.params.id));
});

// DELETE /api/ecritures/:id - uniquement si brouillon
router.delete('/:id', requirePermission('comptabilite', 'creer'), (req, res) => {
  const e = db.prepare('SELECT * FROM ecritures WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Ecriture introuvable' });
  if (e.statut === 'validee') return res.status(400).json({ error: 'Impossible de supprimer une ecriture validee' });

  db.prepare('DELETE FROM ecritures WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// POST /api/ecritures/lettrage - rapprocher un ensemble de lignes sur un meme compte (somme debit = somme credit)
router.post('/lettrage', requirePermission('comptabilite', 'valider'), (req, res) => {
  const { ligne_ids } = req.body;
  if (!Array.isArray(ligne_ids) || ligne_ids.length < 2) return res.status(400).json({ error: 'Au moins 2 lignes requises pour un lettrage' });

  const placeholders = ligne_ids.map(() => '?').join(',');
  const lignes = db.prepare(`SELECT * FROM ecriture_lignes WHERE id IN (${placeholders})`).all(...ligne_ids);
  if (lignes.length !== ligne_ids.length) return res.status(404).json({ error: 'Une ou plusieurs lignes sont introuvables' });

  const comptes = new Set(lignes.map((l) => l.compte_id));
  if (comptes.size > 1) return res.status(400).json({ error: 'Toutes les lignes doivent appartenir au meme compte' });
  if (lignes.some((l) => l.lettrage)) return res.status(400).json({ error: 'Une ou plusieurs lignes sont deja lettrees' });

  const totalDebit = Math.round(lignes.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(lignes.reduce((s, l) => s + l.credit, 0) * 100) / 100;
  if (totalDebit !== totalCredit) return res.status(400).json({ error: `Solde non nul : debit ${totalDebit} != credit ${totalCredit}` });

  const codeLettrage = `L${Date.now().toString(36).toUpperCase()}`;
  const update = db.prepare('UPDATE ecriture_lignes SET lettrage = ? WHERE id = ?');
  for (const id of ligne_ids) update.run(codeLettrage, id);

  res.json({ lettrage: codeLettrage, lignes_id: ligne_ids });
});

module.exports = router;
