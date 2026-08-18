const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function dossierUpload(req) {
  const dir = path.join(__dirname, '../../uploads/tenants', String(req.user.tenant_id), 'entreprise');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossierUpload(req)),
  filename: (req, file, cb) => cb(null, `${file.fieldname}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg'].includes(file.mimetype)) return cb(new Error('Seuls les PNG et JPEG sont acceptes'));
    cb(null, true);
  },
});

// GET /api/entreprise
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM entreprise WHERE id = 1').get());
});

// PUT /api/entreprise - coordonnees texte (reserve admin)
router.put('/', requireRole('admin'), (req, res) => {
  const fields = ['nom', 'adresse', 'telephone', 'email', 'ice', 'directeur_nom'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnee a mettre a jour' });

  const setClause = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  db.prepare(`UPDATE entreprise SET ${setClause} WHERE id = 1`).run(...values);

  res.json(db.prepare('SELECT * FROM entreprise WHERE id = 1').get());
});

// POST /api/entreprise/fichiers - upload logo/cachet/signature (reserve admin)
router.post('/fichiers', requireRole('admin'), upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cachet', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]), (req, res) => {
  const updates = {};
  if (req.files.logo) updates.logo_url = `/uploads/tenants/${req.user.tenant_id}/entreprise/${req.files.logo[0].filename}`;
  if (req.files.cachet) updates.cachet_url = `/uploads/tenants/${req.user.tenant_id}/entreprise/${req.files.cachet[0].filename}`;
  if (req.files.signature) updates.signature_url = `/uploads/tenants/${req.user.tenant_id}/entreprise/${req.files.signature[0].filename}`;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Aucun fichier recu' });

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  db.prepare(`UPDATE entreprise SET ${setClause} WHERE id = 1`).run(...Object.values(updates));

  res.json(db.prepare('SELECT * FROM entreprise WHERE id = 1').get());
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('PNG et JPEG')) {
    return res.status(400).json({ error: err.message === 'File too large' ? 'Fichier trop volumineux (max 5 Mo)' : err.message });
  }
  next(err);
});

module.exports = router;
