const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function dossierUpload(req) {
  const dir = path.join(__dirname, '../../uploads/tenants', String(req.user.tenant_id), 'documents');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossierUpload(req)),
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${suffix}${path.extname(file.originalname)}`);
  },
});

const MIME_AUTORISES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
  fileFilter: (req, file, cb) => {
    if (!MIME_AUTORISES.includes(file.mimetype)) return cb(new Error('Type de fichier non autorise'));
    cb(null, true);
  },
});

// GET /api/documents-projet?projet_id=
router.get('/', (req, res) => {
  const { projet_id } = req.query;
  if (!projet_id) return res.status(400).json({ error: 'projet_id requis' });

  const docs = db.prepare(`
    SELECT d.*, u.nom AS uploade_par_nom FROM documents_projet d
    LEFT JOIN utilisateurs u ON u.id = d.uploade_par
    WHERE d.projet_id = ? ORDER BY d.date_upload DESC
  `).all(projet_id);
  res.json(docs);
});

// POST /api/documents-projet - multipart/form-data avec champ "fichier"
router.post('/', upload.single('fichier'), (req, res) => {
  const { projet_id, categorie, nom } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu' });
  if (!projet_id) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'projet_id requis' });
  }

  const info = db.prepare(`
    INSERT INTO documents_projet (projet_id, nom, categorie, nom_fichier_stocke, taille_octets, uploade_par)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projet_id, nom || req.file.originalname, categorie || 'autre', req.file.filename, req.file.size, req.user.id);

  res.status(201).json(db.prepare('SELECT * FROM documents_projet WHERE id = ?').get(info.lastInsertRowid));
});

// GET /api/documents-projet/:id/telecharger
router.get('/:id/telecharger', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents_projet WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });

  const filePath = path.join(dossierUpload(req), doc.nom_fichier_stocke);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });

  res.download(filePath, doc.nom);
});

// DELETE /api/documents-projet/:id
router.delete('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents_projet WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });

  const filePath = path.join(dossierUpload(req), doc.nom_fichier_stocke);
  fs.unlink(filePath, () => {});
  db.prepare('DELETE FROM documents_projet WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Middleware d'erreur specifique a multer (fichier trop gros, type refuse)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Type de fichier non autorise') {
    return res.status(400).json({ error: err.message === 'File too large' ? 'Fichier trop volumineux (max 20 Mo)' : err.message });
  }
  next(err);
});

module.exports = router;
