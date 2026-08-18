# Chantier — Plateforme SaaS multi-entreprises de gestion de projets BTP

Plateforme **multi-tenant** : chaque entreprise cliente a sa propre base de donnees totalement
isolee. Un compte "plateforme" (toi, l'hebergeur) gere l'ensemble des entreprises clientes.

## Architecture

```
btp-platform/
├── backend/
│   └── data/
│       ├── central.db       # annuaire des entreprises + compte(s) plateforme
│       └── tenants/
│           ├── 1.db          # donnees isolees de l'entreprise cliente n°1
│           ├── 2.db          # donnees isolees de l'entreprise cliente n°2
│           └── ...
└── frontend/    React + Vite + Tailwind
```

Chaque entreprise cliente = un fichier SQLite separe. Aucune requete ne peut accidentellement
melanger les donnees de deux entreprises differentes (isolation garantie par construction,
pas par un simple filtre applicatif).

## Demarrage

### 1. Backend

```bash
cd backend
npm install
npm run seed     # cree le compte plateforme + une entreprise de demonstration
npm run dev       # demarre l'API sur http://localhost:4000
```

**Compte plateforme** (acces a toutes les entreprises clientes) :
- `plateforme@chantier.app` / `plateforme123`

**Entreprise de demonstration** ("Groupe Chantier BTP") :
- `admin@btp.ma` / `admin123` (role admin)
- `chef@btp.ma` / `chef123` (role chef_projet)
- `comptable@btp.ma` / `compta123` (role comptable)
- `acheteur@btp.ma` / `achat123` (role acheteur)

### Ajouter une nouvelle entreprise cliente

Connecte-toi avec le compte plateforme, va dans le menu "Plateforme", clique sur
"+ Nouvelle entreprise cliente". Renseigne le nom de l'entreprise et les identifiants
de son premier compte administrateur. Cette entreprise obtient immediatement sa propre
base de donnees vide, prete a l'emploi — son admin peut se connecter directement.

Le bouton "Entrer" permet de consulter les donnees d'une entreprise cliente (support)
sans connaitre son mot de passe ; un bandeau permet de revenir a la vue plateforme.

### 2. Frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev       # demarre l'app sur http://localhost:5173
```

Ouvrir http://localhost:5173 et se connecter avec un des comptes ci-dessus.

## Modules disponibles (V1)

- **Authentification** avec roles (admin, direction, chef_projet, conducteur_travaux, metreur, comptable)
- **Projets** : creation, liste avec indicateurs financiers, fiche detaillee
- **Chiffrages** : postes avec quantite/prix unitaire, versioning, validation (reporte le budget sur le projet)
- **Bons de commande** : lies a un projet et un fournisseur, avec lignes de commande
- **Contrats de sous-traitance** : montant, taux de retenue de garantie, situations de travaux
- **Depenses** : par categorie, rattachees a un projet
- **Fournisseurs / sous-traitants** : annuaire commun
- **Tableau de bord** : indicateurs globaux (budget engage, depenses reelles, marge moyenne)

## A affiner ensuite

- Edition/suppression sur toutes les entites (actuellement creation + lecture prioritaires)
- Upload de justificatifs (factures/tickets) pour les depenses
- Formulaire complet pour creer un bon de commande avec plusieurs lignes depuis l'UI
- Formulaire de creation de contrat de sous-traitance et gestion des situations depuis l'UI
- Export PDF/Excel des documents (BC, contrats, chiffrages)
- Gestion fine des permissions par ecran cote frontend (actuellement geree cote API)
- Passage a PostgreSQL pour un usage multi-utilisateurs en production
