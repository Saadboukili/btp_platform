const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const centralDb = require('../db/central');
const { getTenantDb, createTenant, inscrireDansAnnuaire } = require('../db/tenantManager');
const { requireAuth, requirePlatformAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requirePlatformAdmin);

// GET /api/plateforme/entreprises - liste toutes les entreprises clientes avec quelques stats
router.get('/entreprises', (req, res) => {
  const tenants = centralDb.prepare('SELECT * FROM tenants ORDER BY date_creation DESC').all();

  for (const t of tenants) {
    try {
      const db = getTenantDb(t.id);
      t.nb_utilisateurs = db.prepare('SELECT COUNT(*) AS c FROM utilisateurs').get().c;
      t.nb_projets = db.prepare('SELECT COUNT(*) AS c FROM projets').get().c;
    } catch {
      t.nb_utilisateurs = 0;
      t.nb_projets = 0;
    }
  }

  res.json(tenants);
});

// POST /api/plateforme/entreprises - cree une nouvelle entreprise cliente + son premier admin
router.post('/entreprises', (req, res) => {
  const { nom, slug, admin_nom, admin_email, admin_mot_de_passe } = req.body;
  if (!nom || !admin_nom || !admin_email || !admin_mot_de_passe) {
    return res.status(400).json({ error: 'nom, admin_nom, admin_email et admin_mot_de_passe sont requis' });
  }
  if (admin_mot_de_passe.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caracteres' });

  const dejaUtilise = centralDb.prepare('SELECT id FROM annuaire_utilisateurs WHERE email = ?').get(admin_email);
  if (dejaUtilise) return res.status(400).json({ error: 'Cet email est deja utilise par une autre entreprise' });

  let tenant;
  try {
    tenant = createTenant({ nom, slug });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const tenantDb = getTenantDb(tenant.id);
  const hash = bcrypt.hashSync(admin_mot_de_passe, 10);
  tenantDb.prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role) VALUES (?, ?, ?, ?)')
    .run(admin_nom, admin_email, hash, 'admin');
  tenantDb.prepare("UPDATE entreprise SET nom = ? WHERE id = 1").run(nom);

  inscrireDansAnnuaire(admin_email, tenant.id);

  res.status(201).json(tenant);
});

// PUT /api/plateforme/entreprises/:id - suspendre / reactiver une entreprise
router.put('/entreprises/:id', (req, res) => {
  const { statut } = req.body;
  if (!['actif', 'suspendu'].includes(statut)) return res.status(400).json({ error: 'statut invalide' });

  const result = centralDb.prepare('UPDATE tenants SET statut = ? WHERE id = ?').run(statut, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entreprise introuvable' });

  res.json(centralDb.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id));
});

// POST /api/plateforme/entreprises/:id/entrer - genere un acces temporaire pour consulter cette entreprise
// (support client) : le compte plateforme obtient un token qui agit comme l'admin de cette entreprise.
router.post('/entreprises/:id/entrer', (req, res) => {
  const tenant = centralDb.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Entreprise introuvable' });

  const token = jwt.sign(
    {
      id: req.user.id,
      nom: `${req.user.nom} (via plateforme)`,
      email: req.user.email,
      role: 'admin',
      tenant_id: tenant.id,
      tenant_nom: tenant.nom,
      visite_plateforme: true,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ token, user: { id: req.user.id, nom: `${req.user.nom} (via plateforme)`, email: req.user.email, role: 'admin', tenant_nom: tenant.nom, visite_plateforme: true } });
});

// ===== Sauvegardes =====
const { execFileSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { creerSauvegarde, listerSauvegardes, BACKUPS_DIR } = require('../backup');

// GET /api/plateforme/sauvegardes
router.get('/sauvegardes', (req, res) => {
  res.json(listerSauvegardes());
});

// POST /api/plateforme/sauvegardes - declenche une sauvegarde immediate
router.post('/sauvegardes', async (req, res) => {
  try {
    const resultat = await creerSauvegarde();
    res.status(201).json(resultat);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde : ' + err.message });
  }
});

// GET /api/plateforme/sauvegardes/:nom/telecharger - archive zip d'une sauvegarde donnee
router.get('/sauvegardes/:nom/telecharger', (req, res) => {
  const nom = req.params.nom;
  if (!/^[0-9A-Za-z_-]+$/.test(nom)) return res.status(400).json({ error: 'Nom de sauvegarde invalide' });

  const dossier = path.join(BACKUPS_DIR, nom);
  if (!fs.existsSync(dossier)) return res.status(404).json({ error: 'Sauvegarde introuvable' });

  const zipPath = path.join(os.tmpdir(), `sauvegarde-${nom}-${Date.now()}.zip`);
  try {
    execFileSync('zip', ['-r', zipPath, '.'], { cwd: dossier });
  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de la creation du zip (l'outil 'zip' est-il installe sur ce serveur ?)" });
  }

  res.download(zipPath, `sauvegarde-${nom}.zip`, () => {
    fs.unlink(zipPath, () => {});
  });
});

module.exports = router;
