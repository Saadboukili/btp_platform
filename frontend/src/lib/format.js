export function formatMontant(value) {
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(value || 0) + ' MAD';
}

export const STATUT_PROJET = {
  appel_offre: { label: 'Appel d\'offre', tone: 'warn' },
  en_preparation: { label: 'En preparation', tone: 'warn' },
  en_cours: { label: 'En cours', tone: 'ok' },
  suspendu: { label: 'Suspendu', tone: 'danger' },
  termine: { label: 'Termine', tone: 'ok' },
  annule: { label: 'Annule', tone: 'danger' },
};

export const STATUT_BC = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  envoye: { label: 'Envoye', tone: 'warn' },
  partiellement_recu: { label: 'Partiellement recu', tone: 'warn' },
  totalement_recu: { label: 'Totalement recu', tone: 'ok' },
  cloture: { label: 'Cloture', tone: 'ok' },
  annule: { label: 'Annule', tone: 'danger' },
};

export const STATUT_CHIFFRAGE = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  envoye: { label: 'Envoye', tone: 'warn' },
  negocie: { label: 'Negocie', tone: 'warn' },
  valide: { label: 'Valide', tone: 'ok' },
  refuse: { label: 'Refuse', tone: 'danger' },
};

export const STATUT_CONTRAT = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  en_cours: { label: 'En cours', tone: 'ok' },
  termine: { label: 'Termine', tone: 'ok' },
  resilie: { label: 'Resilie', tone: 'danger' },
};

export const STATUT_CONTRAT_CLIENT = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  valide: { label: 'Valide', tone: 'ok' },
  termine: { label: 'Termine', tone: 'ok' },
  resilie: { label: 'Resilie', tone: 'danger' },
};

export const CATEGORIE_DEPENSE = {
  main_oeuvre: 'Main d\'oeuvre',
  location_materiel: 'Location materiel',
  transport: 'Transport',
  administratif: 'Administratif',
  autre: 'Autre',
};

export const TYPE_POINTAGE = {
  normal: 'Normal',
  weekend: 'Weekend',
  ferie: 'Jour ferie',
  conge: 'Conge',
  absence: 'Absence',
};

export const STATUT_DEMANDE = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  en_attente: { label: 'En attente', tone: 'warn' },
  approuvee: { label: 'Approuvee', tone: 'ok' },
  rejetee: { label: 'Rejetee', tone: 'danger' },
};

export const STATUT_AO = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  chiffrage: { label: 'En chiffrage', tone: 'warn' },
  valide: { label: 'Valide', tone: 'ok' },
  perdu: { label: 'Perdu', tone: 'danger' },
};

export const STATUT_ATTACHEMENT = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  valide: { label: 'Valide', tone: 'ok' },
};

export const STATUT_DECOMPTE = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  valide: { label: 'Valide', tone: 'ok' },
  facture: { label: 'Facture', tone: 'ok' },
};

export const STATUT_FACTURE = {
  emise: { label: 'Emise', tone: 'warn' },
  partiellement_reglee: { label: 'Partiellement reglee', tone: 'warn' },
  reglee: { label: 'Reglee', tone: 'ok' },
  annulee: { label: 'Annulee', tone: 'danger' },
};

export const STATUT_TACHE = {
  a_faire: { label: 'A faire', tone: 'warn' },
  en_cours: { label: 'En cours', tone: 'warn' },
  termine: { label: 'Termine', tone: 'ok' },
  retard: { label: 'Retard', tone: 'danger' },
};

export const STATUT_BL = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
};

export const STATUT_SITUATION = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  validee: { label: 'Validee', tone: 'ok' },
  payee: { label: 'Payee', tone: 'ok' },
};

export const STATUT_CONSULTATION = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  envoyee: { label: 'Envoyee', tone: 'warn' },
  cloturee: { label: 'Cloturee - a adjuger', tone: 'warn' },
  adjugee: { label: 'Adjugee', tone: 'ok' },
};

export const STATUT_PARTICIPANT = {
  invite: { label: 'Invite', tone: 'warn' },
  repondu: { label: 'A repondu', tone: 'ok' },
  decline: { label: 'Decline', tone: 'danger' },
  retenu: { label: 'Retenu', tone: 'ok' },
  non_retenu: { label: 'Non retenu', tone: 'danger' },
};

export const STATUT_VALIDATION_MATERIAU = {
  en_cours: { label: 'En cours', tone: 'warn' },
  approuve: { label: 'Approuve', tone: 'ok' },
  rejete: { label: 'Rejete', tone: 'danger' },
};

export const STATUT_ETAPE = {
  en_attente: { label: 'En attente', tone: 'warn' },
  approuve: { label: 'Approuve', tone: 'ok' },
  rejete: { label: 'Rejete', tone: 'danger' },
};

export const LABEL_ETAPE = {
  client: 'Client',
  architecte: 'Architecte',
  bureau_etudes: 'Bureau d\'etudes',
  achats: 'Achats',
};
