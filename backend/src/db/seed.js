const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const centralDb = require('./central');
const { createTenant, getTenantDb, inscrireDansAnnuaire } = require('./tenantManager');
const tenantContext = require('./tenantContext');
const db = require('./index');

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM utilisateurs').get().c;
  if (userCount > 0) {
    console.log('La base contient deja des donnees, seed ignore.');
    return;
  }

  const hash = bcrypt.hashSync('admin123', 10);

  const insertUser = db.prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role) VALUES (?, ?, ?, ?)');
  const adminId = insertUser.run('Admin Principal', 'admin@btp.ma', hash, 'admin').lastInsertRowid;
  const chefId = insertUser.run('Youssef Bennani', 'chef@btp.ma', bcrypt.hashSync('chef123', 10), 'chef_projet').lastInsertRowid;
  insertUser.run('Sara Idrissi', 'comptable@btp.ma', bcrypt.hashSync('compta123', 10), 'comptable');
  insertUser.run('Nabil Ouazzani', 'acheteur@btp.ma', bcrypt.hashSync('achat123', 10), 'acheteur');

  const insertTiers = db.prepare(`INSERT INTO tiers (nom, type, contact_nom, telephone, email) VALUES (?, ?, ?, ?, ?)`);
  const fournisseurId = insertTiers.run('Materiaux du Nord SARL', 'fournisseur', 'Karim Alaoui', '0522334455', 'contact@matnord.ma').lastInsertRowid;
  const sousTraitantId = insertTiers.run('Electricite Generale Atlas', 'sous_traitant', 'Hamid Fassi', '0611223344', 'contact@elecatlas.ma').lastInsertRowid;

  db.prepare(`
    UPDATE entreprise SET nom = ?, adresse = ?, telephone = ?, ice = ?, directeur_nom = ?, directeur_id = ?
    WHERE id = 1
  `).run(
    'Groupe Chantier BTP', 'Zone Industrielle, Casablanca', '0522445566', '001234567000089',
    'Admin Principal', adminId
  );

  // Copie des visuels de demonstration (cachet/signature) pour que le PDF du bon de commande
  // soit immediatement testable ; a remplacer par les vrais fichiers via la page "Entreprise"
  const uploadDirEntreprise = path.join(__dirname, '../../uploads/tenants', String(global.__seedTenantId), 'entreprise');
  fs.mkdirSync(uploadDirEntreprise, { recursive: true });
  const cachetSrc = path.join(__dirname, '../assets/cachet-demo.png');
  const signatureSrc = path.join(__dirname, '../assets/signature-demo.png');
  if (fs.existsSync(cachetSrc) && fs.existsSync(signatureSrc)) {
    fs.copyFileSync(cachetSrc, path.join(uploadDirEntreprise, 'cachet.png'));
    fs.copyFileSync(signatureSrc, path.join(uploadDirEntreprise, 'signature.png'));
    db.prepare(`UPDATE entreprise SET cachet_url = '/uploads/tenants/${global.__seedTenantId}/entreprise/cachet.png', signature_url = '/uploads/tenants/${global.__seedTenantId}/entreprise/signature.png' WHERE id = 1`).run();
  }

  const insertProjet = db.prepare(`
    INSERT INTO projets (nom, client, localisation, date_debut_prevue, date_fin_prevue, statut, budget_prevu, chef_projet_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const projetId = insertProjet.run(
    'Residence Al Yassmine', 'Groupe Immobilier Atlas', 'Casablanca', '2026-01-15', '2026-12-15', 'en_cours', 1200000, chefId
  ).lastInsertRowid;

  insertProjet.run('Voirie Quartier Est', 'Commune Urbaine', 'Rabat', '2026-03-01', '2026-08-01', 'en_cours', 650000, chefId);

  const chiffrageId = db.prepare('INSERT INTO chiffrages (projet_id, version, statut) VALUES (?, 1, ?)').run(projetId, 'valide').lastInsertRowid;
  const insertPoste = db.prepare(`INSERT INTO chiffrage_postes (chiffrage_id, designation, categorie, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?, ?)`);
  const posteTerrassementId = insertPoste.run(chiffrageId, 'Terrassement general', 'Terrassement', 'm3', 1500, 45).lastInsertRowid;
  const posteFondationId = insertPoste.run(chiffrageId, 'Beton de fondation', 'Gros oeuvre', 'm3', 320, 950).lastInsertRowid;
  const posteMaconnerieId = insertPoste.run(chiffrageId, 'Maconnerie elevation', 'Gros oeuvre', 'm2', 2100, 180).lastInsertRowid;
  const posteInstallationsId = insertPoste.run(chiffrageId, 'Installations techniques (electricite, plomberie)', 'Second oeuvre', 'ft', 1, 320000).lastInsertRowid;

  const budgetTotal = 1500 * 45 + 320 * 950 + 2100 * 180 + 320000;
  db.prepare('UPDATE projets SET budget_prevu = ? WHERE id = ?').run(budgetTotal, projetId);

  const bcId = db.prepare(`INSERT INTO bons_commande (reference, projet_id, fournisseur_id, statut, chiffrage_poste_id) VALUES (?, ?, ?, ?, ?)`)
    .run('BC-2026-0001', projetId, fournisseurId, 'envoye', posteFondationId).lastInsertRowid;
  db.prepare(`INSERT INTO bon_commande_lignes (bon_commande_id, designation, unite, quantite, prix_unitaire) VALUES (?, ?, ?, ?, ?)`)
    .run(bcId, 'Ciment CPJ45 sac 50kg', 'sac', 800, 62);

  const contratId = db.prepare(`
    INSERT INTO contrats_sous_traitance (reference, projet_id, sous_traitant_id, nature_travaux, montant_total, taux_retenue_garantie, statut, chiffrage_poste_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('CST-2026-0001', projetId, sousTraitantId, 'Installation electrique complete', 320000, 10, 'en_cours', posteInstallationsId).lastInsertRowid;

  db.prepare("INSERT INTO situations_travaux (contrat_id, numero, pourcentage_avancement, montant, statut) VALUES (?, 1, 30, 96000, 'payee')").run(contratId);

  db.prepare(`INSERT INTO depenses (projet_id, categorie, designation, montant, saisie_par, chiffrage_poste_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(projetId, 'main_oeuvre', 'Paie equipe gros oeuvre - Janvier', 145000, adminId, posteMaconnerieId);
  db.prepare(`INSERT INTO depenses (projet_id, categorie, designation, montant, saisie_par, chiffrage_poste_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(projetId, 'location_materiel', 'Location grue mobile - 2 semaines', 38000, adminId, posteFondationId);

  // Tresorerie
  const compteBanqueId = db.prepare('INSERT INTO tresorerie_comptes (nom, type, solde_initial) VALUES (?, ?, ?)').run('Banque Attijari - Compte principal', 'banque', 500000).lastInsertRowid;
  db.prepare('INSERT INTO tresorerie_comptes (nom, type, solde_initial) VALUES (?, ?, ?)').run('Caisse chantier Al Yassmine', 'caisse', 15000);
  db.prepare('INSERT INTO tresorerie_mouvements (compte_id, type, mode, montant, libelle, projet_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(compteBanqueId, 'decaissement', 'virement', 96000, 'Paiement situation 1 - Electricite Generale Atlas', projetId);
  db.prepare('INSERT INTO tresorerie_mouvements (compte_id, type, mode, montant, libelle, projet_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(compteBanqueId, 'encaissement', 'virement', 300000, 'Avance client - Residence Al Yassmine', projetId);

  // Planning
  const insertTache = db.prepare('INSERT INTO planning_taches (projet_id, designation, date_debut, date_fin, avancement_pct, valeur_planifiee, valeur_realisee, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertTache.run(projetId, 'Terrassement general', '2026-01-15', '2026-02-15', 100, 67500, 67500, 'termine');
  insertTache.run(projetId, 'Fondations beton', '2026-02-16', '2026-04-01', 60, 304000, 182400, 'en_cours');
  insertTache.run(projetId, 'Elevation maconnerie', '2026-04-02', '2026-06-30', 0, 378000, 0, 'a_faire');

  // Demande d'achat de demonstration (en attente de validation direction)
  const daInfo = db.prepare(`INSERT INTO demandes_achat (reference, projet_id, demandeur_id, statut) VALUES (?, ?, ?, ?)`)
    .run('DA-2026-0001', projetId, chefId, 'en_attente');
  db.prepare('INSERT INTO demande_achat_lignes (demande_id, designation, unite, quantite) VALUES (?, ?, ?, ?)')
    .run(daInfo.lastInsertRowid, 'Fer a beton HA12', 'barre', 500);

  // Main d'oeuvre
  const insertFonction = db.prepare('INSERT INTO fonctions (nom, taux_horaire) VALUES (?, ?)');
  const fonctionMaconId = insertFonction.run('Macon', 35).lastInsertRowid;
  const fonctionChefEquipeId = insertFonction.run('Chef d\'equipe', 55).lastInsertRowid;
  insertFonction.run('Manoeuvre', 25);

  const insertPersonnel = db.prepare('INSERT INTO personnel (nom, cin, telephone, fonction_id, date_embauche) VALUES (?, ?, ?, ?, ?)');
  const personnel1Id = insertPersonnel.run('Rachid Amrani', 'BE123456', '0611112222', fonctionMaconId, '2024-03-01').lastInsertRowid;
  const personnel2Id = insertPersonnel.run('Mustapha Ziani', 'BE654321', '0622223333', fonctionChefEquipeId, '2023-06-15').lastInsertRowid;

  const insertPointage = db.prepare('INSERT INTO pointages (personnel_id, projet_id, date_pointage, type, heures_normales, heures_supplementaires, saisie_par) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertPointage.run(personnel1Id, projetId, '2026-08-10', 'normal', 8, 0, adminId);
  insertPointage.run(personnel1Id, projetId, '2026-08-11', 'normal', 8, 2, adminId);
  insertPointage.run(personnel2Id, projetId, '2026-08-10', 'normal', 8, 0, adminId);
  insertPointage.run(personnel2Id, projetId, '2026-08-11', 'weekend', 6, 0, adminId);

  // Comptabilite generale
  const insertCompte = db.prepare('INSERT INTO plan_comptable (numero, intitule, classe) VALUES (?, ?, ?)');
  const compteBanque = insertCompte.run('5141', 'Banques', 5).lastInsertRowid;
  const compteCaisse = insertCompte.run('5161', 'Caisses', 5).lastInsertRowid;
  const compteClients = insertCompte.run('3421', 'Clients', 3).lastInsertRowid;
  const compteFournisseurs = insertCompte.run('4411', 'Fournisseurs', 4).lastInsertRowid;
  const compteAchats = insertCompte.run('6111', 'Achats de matieres premieres', 6).lastInsertRowid;
  insertCompte.run('6167', 'Sous-traitance', 6);
  insertCompte.run('6171', 'Charges de personnel', 6);
  const compteVentes = insertCompte.run('7111', 'Ventes de biens et services produits', 7).lastInsertRowid;
  insertCompte.run('34551', 'Etat - TVA recuperable', 3);
  insertCompte.run('4455', 'Etat - TVA facturee', 4);
  insertCompte.run('1111', 'Capital social', 1);
  insertCompte.run('2130', 'Constructions', 2);

  const insertJournal = db.prepare('INSERT INTO journaux (code, nom, type) VALUES (?, ?, ?)');
  const journalVentes = insertJournal.run('VE', 'Journal des ventes', 'ventes').lastInsertRowid;
  const journalAchats = insertJournal.run('AC', 'Journal des achats', 'achats').lastInsertRowid;
  insertJournal.run('BQ', 'Journal de banque', 'banque');
  insertJournal.run('OD', 'Operations diverses', 'operations_diverses');

  const exerciceId = db.prepare('INSERT INTO exercices_comptables (annee, date_debut, date_fin) VALUES (?, ?, ?)')
    .run(2026, '2026-01-01', '2026-12-31').lastInsertRowid;

  // Ecriture de vente exemple (validee, equilibree)
  const ecritureInfo = db.prepare(`
    INSERT INTO ecritures (numero_piece, journal_id, exercice_id, projet_id, date_ecriture, libelle, statut, saisie_par)
    VALUES (?, ?, ?, ?, ?, ?, 'validee', ?)
  `).run('VE-2026-0001', journalVentes, exerciceId, projetId, '2026-02-15', 'Facture FV-2026-0001 - Residence Al Yassmine', adminId);
  const insertLigneEcriture = db.prepare('INSERT INTO ecriture_lignes (ecriture_id, compte_id, libelle, debit, credit) VALUES (?, ?, ?, ?, ?)');
  insertLigneEcriture.run(ecritureInfo.lastInsertRowid, compteClients, 'Facture client', 217728, 0);
  insertLigneEcriture.run(ecritureInfo.lastInsertRowid, compteVentes, 'Vente travaux', 0, 181440);
  const compteTva = db.prepare("SELECT id FROM plan_comptable WHERE numero = '4455'").get().id;
  insertLigneEcriture.run(ecritureInfo.lastInsertRowid, compteTva, 'TVA collectee', 0, 36288);

  // Ecriture d'achat exemple (validee)
  const ecritureAchatInfo = db.prepare(`
    INSERT INTO ecritures (numero_piece, journal_id, exercice_id, projet_id, date_ecriture, libelle, statut, saisie_par)
    VALUES (?, ?, ?, ?, ?, ?, 'validee', ?)
  `).run('AC-2026-0001', journalAchats, exerciceId, projetId, '2026-02-20', 'Achat ciment BC-2026-0001', adminId);
  insertLigneEcriture.run(ecritureAchatInfo.lastInsertRowid, compteAchats, 'Ciment CPJ45', 49600, 0);
  const compteTvaRecup = db.prepare("SELECT id FROM plan_comptable WHERE numero = '34551'").get().id;
  insertLigneEcriture.run(ecritureAchatInfo.lastInsertRowid, compteTvaRecup, 'TVA deductible', 9920, 0);
  insertLigneEcriture.run(ecritureAchatInfo.lastInsertRowid, compteFournisseurs, 'Materiaux du Nord SARL', 0, 59520);

  // Matrice de permissions par defaut (Administration > Permissions), miroir raisonnable
  // des restrictions deja en place dans le code ; l'admin garde toujours un acces total.
  const MODULES = ['projets', 'achats', 'sous_traitance', 'stock', 'budgets', 'tresorerie', 'comptabilite', 'rh', 'controle_performance', 'administration'];
  const DEFAUTS = {
    direction:          { achats: { valider: true }, sous_traitance: { valider: true } },
    chef_projet:        { achats: { creer: true, valider: true }, sous_traitance: { creer: true, valider: true }, stock: { creer: true, valider: true }, budgets: { creer: true } },
    conducteur_travaux: { achats: { creer: true }, sous_traitance: { creer: true }, stock: { creer: true } },
    metreur:            { budgets: { creer: true } },
    comptable:          { tresorerie: { creer: true, valider: true }, comptabilite: { creer: true, valider: true }, achats: { valider: true }, sous_traitance: { valider: true } },
    acheteur:           { achats: { creer: true, valider: true }, stock: { creer: true } },
  };

  const insertPermission = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role, module, peut_voir, peut_creer, peut_valider) VALUES (?, ?, 1, ?, ?)
  `);
  for (const [role, modules] of Object.entries(DEFAUTS)) {
    for (const module of MODULES) {
      const p = modules[module] || {};
      insertPermission.run(role, module, p.creer ? 1 : 0, p.valider ? 1 : 0);
    }
  }

  console.log('Donnees de demonstration inserees.');
  console.log('Comptes de test:');
  console.log('  admin@btp.ma / admin123 (admin)');
  console.log('  chef@btp.ma / chef123 (chef_projet)');
  console.log('  comptable@btp.ma / compta123 (comptable)');
  console.log('  acheteur@btp.ma / achat123 (acheteur)');

  // Inscription des utilisateurs de demo dans l'annuaire central de la plateforme
  inscrireDansAnnuaire('admin@btp.ma', global.__seedTenantId);
  inscrireDansAnnuaire('chef@btp.ma', global.__seedTenantId);
  inscrireDansAnnuaire('comptable@btp.ma', global.__seedTenantId);
  inscrireDansAnnuaire('acheteur@btp.ma', global.__seedTenantId);
}

function seedPlateformeEtTenantDemo() {
  // 1. Compte plateforme (proprietaire) : gere toutes les entreprises clientes
  const nbAdmins = centralDb.prepare('SELECT COUNT(*) AS c FROM plateforme_admins').get().c;
  if (nbAdmins === 0) {
    const hash = bcrypt.hashSync('plateforme123', 10);
    centralDb.prepare('INSERT INTO plateforme_admins (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)')
      .run('Proprietaire Plateforme', 'plateforme@chantier.app', hash);
    console.log('');
    console.log('Compte PLATEFORME (acces a toutes les entreprises) :');
    console.log('  plateforme@chantier.app / plateforme123');
  }

  // 2. Une entreprise de demonstration, avec ses propres donnees isolees
  const existant = centralDb.prepare('SELECT * FROM tenants WHERE slug = ?').get('demo-btp');
  if (existant) {
    console.log('');
    console.log(`Entreprise de demo "demo-btp" deja presente (id=${existant.id}), seed des donnees ignore.`);
    return;
  }

  const tenant = createTenant({ nom: 'Groupe Chantier BTP', slug: 'demo-btp' });
  console.log('');
  console.log(`Entreprise de demo creee : "${tenant.nom}" (id=${tenant.id})`);

  global.__seedTenantId = tenant.id;
  const tenantDb = getTenantDb(tenant.id);
  tenantContext.run({ db: tenantDb, tenantId: tenant.id }, () => {
    seed();
  });
}

seedPlateformeEtTenantDemo();
