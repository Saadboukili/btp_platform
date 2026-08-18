-- ===================== UTILISATEURS & ROLES =====================
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','direction','chef_projet','conducteur_travaux','metreur','comptable','acheteur')),
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===================== TIERS (fournisseurs / sous-traitants) =====================
CREATE TABLE IF NOT EXISTS tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('fournisseur','sous_traitant','les_deux')),
  contact_nom TEXT,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  rib TEXT,
  ice TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===================== PROJETS =====================
CREATE TABLE IF NOT EXISTS projets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  client TEXT,
  localisation TEXT,
  date_debut_prevue TEXT,
  date_fin_prevue TEXT,
  date_debut_reelle TEXT,
  date_fin_reelle TEXT,
  statut TEXT NOT NULL DEFAULT 'en_preparation' CHECK(statut IN ('appel_offre','en_preparation','en_cours','suspendu','termine','annule')),
  budget_prevu REAL DEFAULT 0,
  chef_projet_id INTEGER REFERENCES utilisateurs(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===================== CHIFFRAGES =====================
CREATE TABLE IF NOT EXISTS chiffrages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','envoye','negocie','valide','refuse')),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS chiffrage_postes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chiffrage_id INTEGER NOT NULL REFERENCES chiffrages(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  categorie TEXT,
  unite TEXT NOT NULL DEFAULT 'u',
  quantite REAL NOT NULL DEFAULT 0,
  prix_unitaire REAL NOT NULL DEFAULT 0,
  ordre INTEGER DEFAULT 0
);

-- ===================== ENTREPRISE (parametrage, cachet, signature) =====================
CREATE TABLE IF NOT EXISTS entreprise (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nom TEXT NOT NULL DEFAULT 'Mon entreprise',
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  ice TEXT,
  logo_url TEXT,
  cachet_url TEXT,
  signature_url TEXT,
  directeur_nom TEXT,
  directeur_id INTEGER REFERENCES utilisateurs(id)
);

-- ===================== DOCUMENTS PROJET (contrats, plans, etc.) =====================
CREATE TABLE IF NOT EXISTS documents_projet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'autre' CHECK(categorie IN ('contrat','plan','photo','administratif','autre')),
  nom_fichier_stocke TEXT NOT NULL,
  taille_octets INTEGER,
  uploade_par INTEGER REFERENCES utilisateurs(id),
  date_upload TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_projet ON documents_projet(projet_id);

-- ===================== ACHATS : DEMANDES D'ACHAT =====================
CREATE TABLE IF NOT EXISTS demandes_achat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  demandeur_id INTEGER REFERENCES utilisateurs(id),
  valide_par INTEGER REFERENCES utilisateurs(id),
  bc_genere_par INTEGER REFERENCES utilisateurs(id),
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','en_attente','validee','rejetee','bon_commande_genere')),
  date_demande TEXT DEFAULT CURRENT_TIMESTAMP,
  commentaire TEXT,
  bon_commande_id INTEGER REFERENCES bons_commande(id)
);

CREATE TABLE IF NOT EXISTS demande_achat_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL REFERENCES demandes_achat(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  unite TEXT DEFAULT 'u',
  quantite REAL NOT NULL DEFAULT 0
);

-- ===================== BONS DE COMMANDE =====================
CREATE TABLE IF NOT EXISTS bons_commande (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  fournisseur_id INTEGER REFERENCES tiers(id),
  demande_achat_id INTEGER REFERENCES demandes_achat(id),
  chiffrage_poste_id INTEGER REFERENCES chiffrage_postes(id),
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','envoye','partiellement_recu','totalement_recu','cloture','annule')),
  rabais_pct REAL DEFAULT 0,
  avance_pct REAL DEFAULT 0,
  retenue_pct REAL DEFAULT 0,
  delai_paiement_jours INTEGER DEFAULT 0,
  signature_appliquee INTEGER NOT NULL DEFAULT 0,
  date_emission TEXT DEFAULT CURRENT_TIMESTAMP,
  date_livraison_prevue TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bon_commande_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_commande_id INTEGER NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  unite TEXT DEFAULT 'u',
  quantite REAL NOT NULL DEFAULT 0,
  prix_unitaire REAL NOT NULL DEFAULT 0,
  quantite_recue REAL NOT NULL DEFAULT 0
);

-- ===================== BONS DE LIVRAISON (reception marchandises) =====================
CREATE TABLE IF NOT EXISTS bons_livraison (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  bon_commande_id INTEGER NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  date_reception TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bon_livraison_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bon_livraison_id INTEGER NOT NULL REFERENCES bons_livraison(id) ON DELETE CASCADE,
  bon_commande_ligne_id INTEGER NOT NULL REFERENCES bon_commande_lignes(id),
  quantite_recue REAL NOT NULL DEFAULT 0,
  quantite_acceptee REAL NOT NULL DEFAULT 0
);

-- ===================== APPELS D'OFFRE =====================
CREATE TABLE IF NOT EXISTS appels_offre (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  client TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','chiffrage','valide','perdu')),
  coefficient REAL DEFAULT 1,
  charges_indirectes_pct REAL DEFAULT 0,
  marge_pct REAL DEFAULT 0,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  projet_id INTEGER REFERENCES projets(id),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS appel_offre_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offre_id INTEGER NOT NULL REFERENCES appels_offre(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  categorie TEXT CHECK(categorie IN ('materiaux','main_oeuvre','sous_traitance','materiel','autre')),
  unite TEXT DEFAULT 'u',
  quantite REAL NOT NULL DEFAULT 0,
  cout_unitaire REAL NOT NULL DEFAULT 0,
  prix_vente_unitaire REAL NOT NULL DEFAULT 0
);

-- ===================== CONTRATS CLIENT (bordereau de prix, par chantier) =====================
CREATE TABLE IF NOT EXISTS contrats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','valide','termine','resilie')),
  taux_retenue_garantie REAL DEFAULT 0,
  taux_compte_prorata REAL DEFAULT 0,
  taux_finition REAL DEFAULT 0,
  date_signature TEXT,
  appel_offre_id INTEGER REFERENCES appels_offre(id),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS contrat_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrat_id INTEGER NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  unite TEXT DEFAULT 'u',
  quantite REAL NOT NULL DEFAULT 0,
  prix_unitaire REAL NOT NULL DEFAULT 0
);

-- ===================== PLANNING (taches par chantier) =====================
CREATE TABLE IF NOT EXISTS planning_taches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  contrat_ligne_id INTEGER REFERENCES contrat_lignes(id),
  designation TEXT NOT NULL,
  date_debut TEXT,
  date_fin TEXT,
  avancement_pct REAL NOT NULL DEFAULT 0,
  valeur_planifiee REAL NOT NULL DEFAULT 0,
  valeur_realisee REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_faire' CHECK(statut IN ('a_faire','en_cours','termine','retard'))
);

-- ===================== ATTACHEMENTS / DECOMPTES / FACTURES DE VENTE =====================
CREATE TABLE IF NOT EXISTS attachements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrat_id INTEGER NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  date_attachement TEXT DEFAULT CURRENT_TIMESTAMP,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','valide')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS attachement_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attachement_id INTEGER NOT NULL REFERENCES attachements(id) ON DELETE CASCADE,
  contrat_ligne_id INTEGER NOT NULL REFERENCES contrat_lignes(id),
  quantite_cumulee REAL NOT NULL DEFAULT 0,
  montant_cumule REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS decomptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  attachement_id INTEGER NOT NULL REFERENCES attachements(id),
  montant_brut REAL NOT NULL DEFAULT 0,
  taux_tva REAL NOT NULL DEFAULT 20,
  montant_retenues REAL NOT NULL DEFAULT 0,
  net_a_payer REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','valide','facture')),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures_vente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  decompte_id INTEGER NOT NULL REFERENCES decomptes(id),
  projet_id INTEGER NOT NULL REFERENCES projets(id),
  montant REAL NOT NULL DEFAULT 0,
  montant_regle REAL NOT NULL DEFAULT 0,
  date_facture TEXT DEFAULT CURRENT_TIMESTAMP,
  date_echeance TEXT,
  statut TEXT NOT NULL DEFAULT 'emise' CHECK(statut IN ('emise','partiellement_reglee','reglee','annulee'))
);

-- ===================== VALIDATION MATERIAUX =====================
-- ===================== VALIDATION MATERIAUX (circuit sequentiel) =====================
CREATE TABLE IF NOT EXISTS validations_materiaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  fournisseur_suggere TEXT,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK(statut IN ('en_cours','approuve','rejete')),
  demandeur_id INTEGER REFERENCES utilisateurs(id),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS validation_materiaux_etapes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_id INTEGER NOT NULL REFERENCES validations_materiaux(id) ON DELETE CASCADE,
  etape TEXT NOT NULL CHECK(etape IN ('client','architecte','bureau_etudes','achats')),
  ordre INTEGER NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente','approuve','rejete')),
  commentaire TEXT,
  date_traitement TEXT
);

-- ===================== SOUS-TRAITANCE : CONSULTATIONS ET ADJUDICATION =====================
CREATE TABLE IF NOT EXISTS consultations_sous_traitance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  nature_travaux TEXT NOT NULL,
  description TEXT,
  date_limite_reponse TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','envoyee','cloturee','adjugee')),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultation_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL REFERENCES consultations_sous_traitance(id) ON DELETE CASCADE,
  sous_traitant_id INTEGER NOT NULL REFERENCES tiers(id),
  montant_propose REAL,
  delai_propose_jours INTEGER,
  statut TEXT NOT NULL DEFAULT 'invite' CHECK(statut IN ('invite','repondu','decline','retenu','non_retenu')),
  notes TEXT,
  date_reponse TEXT
);

CREATE INDEX IF NOT EXISTS idx_consultations_projet ON consultations_sous_traitance(projet_id);
CREATE INDEX IF NOT EXISTS idx_consultation_participants ON consultation_participants(consultation_id);

-- ===================== SOUS-TRAITANCE : DECOMPTES ET FACTURES =====================
CREATE TABLE IF NOT EXISTS decomptes_sous_traitant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  situation_id INTEGER NOT NULL REFERENCES situations_travaux(id),
  montant_brut REAL NOT NULL DEFAULT 0,
  montant_retenues REAL NOT NULL DEFAULT 0,
  net_a_payer REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','valide','facture')),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures_sous_traitant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  decompte_id INTEGER NOT NULL REFERENCES decomptes_sous_traitant(id),
  contrat_id INTEGER NOT NULL REFERENCES contrats_sous_traitance(id),
  montant REAL NOT NULL DEFAULT 0,
  montant_regle REAL NOT NULL DEFAULT 0,
  date_facture TEXT DEFAULT CURRENT_TIMESTAMP,
  statut TEXT NOT NULL DEFAULT 'emise' CHECK(statut IN ('emise','partiellement_reglee','reglee','annulee'))
);

-- ===================== TRESORERIE =====================
CREATE TABLE IF NOT EXISTS tresorerie_comptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('banque','caisse')),
  solde_initial REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tresorerie_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compte_id INTEGER NOT NULL REFERENCES tresorerie_comptes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('encaissement','decaissement')),
  mode TEXT CHECK(mode IN ('cheque','virement','especes')),
  montant REAL NOT NULL DEFAULT 0,
  libelle TEXT NOT NULL,
  projet_id INTEGER REFERENCES projets(id),
  date_mouvement TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===================== CONTRATS DE SOUS-TRAITANCE =====================
CREATE TABLE IF NOT EXISTS contrats_sous_traitance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  sous_traitant_id INTEGER NOT NULL REFERENCES tiers(id),
  chiffrage_poste_id INTEGER REFERENCES chiffrage_postes(id),
  nature_travaux TEXT,
  montant_total REAL NOT NULL DEFAULT 0,
  taux_retenue_garantie REAL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK(statut IN ('brouillon','en_cours','termine','resilie')),
  date_signature TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS situations_travaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrat_id INTEGER NOT NULL REFERENCES contrats_sous_traitance(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  date_situation TEXT DEFAULT CURRENT_TIMESTAMP,
  pourcentage_avancement REAL NOT NULL DEFAULT 0,
  montant REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','validee','payee'))
);

-- ===================== DEPENSES =====================
CREATE TABLE IF NOT EXISTS depenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  chiffrage_poste_id INTEGER REFERENCES chiffrage_postes(id),
  categorie TEXT NOT NULL CHECK(categorie IN ('main_oeuvre','location_materiel','transport','administratif','autre')),
  designation TEXT NOT NULL,
  montant REAL NOT NULL DEFAULT 0,
  date_depense TEXT DEFAULT CURRENT_TIMESTAMP,
  justificatif_url TEXT,
  saisie_par INTEGER REFERENCES utilisateurs(id)
);

-- ===================== MAIN D'OEUVRE =====================
CREATE TABLE IF NOT EXISTS fonctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  taux_horaire REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS personnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  cin TEXT,
  telephone TEXT,
  fonction_id INTEGER REFERENCES fonctions(id),
  date_embauche TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS pointages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  date_pointage TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal' CHECK(type IN ('normal','weekend','ferie','conge','absence')),
  heures_normales REAL NOT NULL DEFAULT 0,
  heures_supplementaires REAL NOT NULL DEFAULT 0,
  saisie_par INTEGER REFERENCES utilisateurs(id)
);

CREATE INDEX IF NOT EXISTS idx_pointages_projet ON pointages(projet_id);
-- ===================== COMPTABILITE GENERALE =====================
CREATE TABLE IF NOT EXISTS exercices_comptables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee INTEGER NOT NULL UNIQUE,
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK(statut IN ('ouvert','cloture'))
);

CREATE TABLE IF NOT EXISTS journaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('achats','ventes','banque','caisse','operations_diverses'))
);

CREATE TABLE IF NOT EXISTS plan_comptable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT NOT NULL UNIQUE,
  intitule TEXT NOT NULL,
  classe INTEGER NOT NULL CHECK(classe BETWEEN 1 AND 7)
);

CREATE TABLE IF NOT EXISTS ecritures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_piece TEXT NOT NULL UNIQUE,
  journal_id INTEGER NOT NULL REFERENCES journaux(id),
  exercice_id INTEGER NOT NULL REFERENCES exercices_comptables(id),
  projet_id INTEGER REFERENCES projets(id),
  date_ecriture TEXT NOT NULL,
  libelle TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','validee')),
  saisie_par INTEGER REFERENCES utilisateurs(id),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ecriture_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ecriture_id INTEGER NOT NULL REFERENCES ecritures(id) ON DELETE CASCADE,
  compte_id INTEGER NOT NULL REFERENCES plan_comptable(id),
  libelle TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  lettrage TEXT
);

CREATE INDEX IF NOT EXISTS idx_ecriture_lignes_compte ON ecriture_lignes(compte_id);
CREATE INDEX IF NOT EXISTS idx_ecritures_exercice ON ecritures(exercice_id);
CREATE INDEX IF NOT EXISTS idx_pointages_personnel ON pointages(personnel_id);
CREATE INDEX IF NOT EXISTS idx_chiffrages_projet ON chiffrages(projet_id);
CREATE INDEX IF NOT EXISTS idx_bc_projet ON bons_commande(projet_id);
CREATE INDEX IF NOT EXISTS idx_contrats_projet ON contrats_sous_traitance(projet_id);
CREATE INDEX IF NOT EXISTS idx_depenses_projet ON depenses(projet_id);
CREATE INDEX IF NOT EXISTS idx_demandes_projet ON demandes_achat(projet_id);
CREATE INDEX IF NOT EXISTS idx_bl_bc ON bons_livraison(bon_commande_id);
CREATE INDEX IF NOT EXISTS idx_contrats_client_projet ON contrats(projet_id);
CREATE INDEX IF NOT EXISTS idx_planning_projet ON planning_taches(projet_id);
CREATE INDEX IF NOT EXISTS idx_tresorerie_mvt_compte ON tresorerie_mouvements(compte_id);

-- ===================== ADMINISTRATION : AFFECTATION UTILISATEURS/CHANTIERS =====================
CREATE TABLE IF NOT EXISTS projet_utilisateurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  UNIQUE(projet_id, utilisateur_id)
);

-- ===================== ADMINISTRATION : MATRICE DE PERMISSIONS (par role/module) =====================
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  peut_voir INTEGER NOT NULL DEFAULT 1,
  peut_creer INTEGER NOT NULL DEFAULT 0,
  peut_valider INTEGER NOT NULL DEFAULT 0,
  UNIQUE(role, module)
);

-- ===================== REFERENTIELS =====================
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  contact_nom TEXT,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  ice TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS entrepots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  adresse TEXT,
  projet_id INTEGER REFERENCES projets(id) -- NULL si entrepot central non rattache a un chantier
);

CREATE TABLE IF NOT EXISTS familles_produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES familles_produits(id)
);

CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE,
  designation TEXT NOT NULL,
  famille_id INTEGER REFERENCES familles_produits(id),
  unite TEXT NOT NULL DEFAULT 'u',
  seuil_alerte REAL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS materiautheque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  designation TEXT NOT NULL,
  categorie TEXT,
  fournisseur_id INTEGER REFERENCES tiers(id),
  fiche_technique_url TEXT,
  photo_url TEXT,
  notes TEXT
);

-- ===================== STOCK =====================
CREATE TABLE IF NOT EXISTS stock_niveaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produit_id INTEGER NOT NULL REFERENCES produits(id),
  entrepot_id INTEGER NOT NULL REFERENCES entrepots(id),
  quantite REAL NOT NULL DEFAULT 0,
  UNIQUE(produit_id, entrepot_id)
);

CREATE TABLE IF NOT EXISTS stock_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produit_id INTEGER NOT NULL REFERENCES produits(id),
  type TEXT NOT NULL CHECK(type IN ('entree','sortie','transfert','inventaire')),
  entrepot_source_id INTEGER REFERENCES entrepots(id),
  entrepot_destination_id INTEGER REFERENCES entrepots(id),
  quantite REAL NOT NULL,
  motif TEXT,
  date_mouvement TEXT DEFAULT CURRENT_TIMESTAMP,
  saisie_par INTEGER REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS inventaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  entrepot_id INTEGER NOT NULL REFERENCES entrepots(id),
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK(statut IN ('en_cours','cloture')),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  cloture_par INTEGER REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS inventaire_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventaire_id INTEGER NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES produits(id),
  quantite_theorique REAL NOT NULL DEFAULT 0,
  quantite_comptee REAL,
  UNIQUE(inventaire_id, produit_id)
);

-- ===================== IMPORTATIONS =====================
CREATE TABLE IF NOT EXISTS importations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  projet_id INTEGER REFERENCES projets(id),
  fournisseur_id INTEGER REFERENCES tiers(id),
  devise TEXT NOT NULL DEFAULT 'EUR',
  taux_change REAL NOT NULL DEFAULT 1,
  incoterm TEXT,
  montant_marchandise_devise REAL NOT NULL DEFAULT 0,
  frais_transport REAL NOT NULL DEFAULT 0,
  frais_douane REAL NOT NULL DEFAULT 0,
  frais_assurance REAL NOT NULL DEFAULT 0,
  frais_transit REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK(statut IN ('en_cours','receptionnee','cloturee')),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- ===================== BUDGETS : POSTES HIERARCHIQUES ET BIBLIOTHEQUES =====================
CREATE TABLE IF NOT EXISTS postes_budgetaires_ref (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK(categorie IN ('achats','main_oeuvre','frais_chantier','charges_indirectes')),
  parent_id INTEGER REFERENCES postes_budgetaires_ref(id)
);

CREATE TABLE IF NOT EXISTS bibliotheque_couts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  designation TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('sous_traitance','materiel')),
  unite TEXT NOT NULL DEFAULT 'u',
  cout_unitaire REAL NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS types_prestation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  unite TEXT NOT NULL DEFAULT 'm2'
);

CREATE TABLE IF NOT EXISTS estimations_prestations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_prestation_id INTEGER NOT NULL REFERENCES types_prestation(id),
  designation TEXT NOT NULL,
  ressource_type TEXT NOT NULL CHECK(ressource_type IN ('materiaux','main_oeuvre')),
  quantite_par_unite REAL NOT NULL DEFAULT 0,
  cout_unitaire REAL NOT NULL DEFAULT 0
);

-- ===================== COMPTABILITE : PAIEMENTS MULTI-FACTURES =====================
CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('client','fournisseur')),
  tiers_nom TEXT NOT NULL,
  montant_total REAL NOT NULL DEFAULT 0,
  mode TEXT CHECK(mode IN ('cheque','virement','especes')),
  compte_tresorerie_id INTEGER REFERENCES tresorerie_comptes(id),
  date_paiement TEXT DEFAULT CURRENT_TIMESTAMP,
  saisie_par INTEGER REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS paiement_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paiement_id INTEGER NOT NULL REFERENCES paiements(id) ON DELETE CASCADE,
  facture_vente_id INTEGER REFERENCES factures_vente(id),
  facture_sous_traitant_id INTEGER REFERENCES factures_sous_traitant(id),
  montant REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stock_niveaux_produit ON stock_niveaux(produit_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_produit ON stock_mouvements(produit_id);
CREATE INDEX IF NOT EXISTS idx_projet_utilisateurs_projet ON projet_utilisateurs(projet_id);

INSERT OR IGNORE INTO entreprise (id, nom) VALUES (1, 'Mon entreprise');
