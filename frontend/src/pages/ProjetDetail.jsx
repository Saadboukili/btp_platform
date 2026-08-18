import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import {
  formatMontant, STATUT_PROJET, STATUT_BC, STATUT_CHIFFRAGE, STATUT_CONTRAT, STATUT_CONTRAT_CLIENT,
  CATEGORIE_DEPENSE, STATUT_ATTACHEMENT, STATUT_DECOMPTE, STATUT_FACTURE, STATUT_TACHE, STATUT_SITUATION,
  STATUT_VALIDATION_MATERIAU, STATUT_ETAPE, LABEL_ETAPE,
} from '../lib/format';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const TABS = ['Apercu', 'Documents', 'Chiffrage', 'Controle budgetaire', 'Contrat', 'Planning', 'Bons de commande', 'Sous-traitance', 'Validation materiaux', 'Depenses'];

export default function ProjetDetail() {
  const { id } = useParams();
  const [projet, setProjet] = useState(null);
  const [tab, setTab] = useState('Apercu');

  function charger() {
    api.get(`/projets/${id}`).then((res) => setProjet(res.data));
  }

  useEffect(charger, [id]);

  if (!projet) return <div className="p-8 text-sm text-concrete">Chargement...</div>;

  const totalEngage = projet.depenses.reduce((s, d) => s + d.montant, 0)
    + projet.bons_commande.reduce((s, b) => s + b.montant_total, 0)
    + projet.contrats_sous_traitance.reduce((s, c) => s + c.montant_total, 0);

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/projets" className="text-sm text-concrete hover:text-blueprint">← Retour aux projets</Link>

      <div className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{projet.nom}</h1>
          <p className="text-sm text-concrete mt-0.5">{projet.client} · {projet.localisation}</p>
        </div>
        <Badge {...(STATUT_PROJET[projet.statut] || { label: projet.statut, tone: 'warn' })} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Budget prevu</p>
          <p className="text-xl font-semibold">{formatMontant(projet.budget_prevu)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Total engage</p>
          <p className="text-xl font-semibold">{formatMontant(totalEngage)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Solde</p>
          <p className={`text-xl font-semibold ${projet.budget_prevu - totalEngage < 0 ? 'text-danger' : 'text-ok'}`}>
            {formatMontant(projet.budget_prevu - totalEngage)}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t ? 'border-safety text-ink font-medium' : 'border-transparent text-concrete hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Apercu' && <Apercu projet={projet} />}
      {tab === 'Documents' && <Documents projetId={projet.id} />}
      {tab === 'Chiffrage' && <Chiffrage projet={projet} onUpdate={charger} />}
      {tab === 'Controle budgetaire' && <ControleBudgetaireProjet projetId={projet.id} />}
      {tab === 'Contrat' && <ContratClient projet={projet} onUpdate={charger} />}
      {tab === 'Planning' && <Planning projet={projet} />}
      {tab === 'Bons de commande' && <BonsCommande projet={projet} onUpdate={charger} />}
      {tab === 'Sous-traitance' && <SousTraitance projet={projet} onUpdate={charger} />}
      {tab === 'Validation materiaux' && <ValidationMateriaux projetId={projet.id} />}
      {tab === 'Depenses' && <Depenses projet={projet} onUpdate={charger} />}
    </div>
  );
}

function Apercu({ projet }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="card bg-white border border-border rounded-lg p-4">
        <p className="text-concrete mb-2">Dates</p>
        <p>Debut prevu : {projet.date_debut_prevue || '—'}</p>
        <p>Fin prevue : {projet.date_fin_prevue || '—'}</p>
      </div>
      <div className="card bg-white border border-border rounded-lg p-4">
        <p className="text-concrete mb-2">Repartition des engagements</p>
        <p>Depenses : {formatMontant(projet.depenses.reduce((s, d) => s + d.montant, 0))}</p>
        <p>Bons de commande : {formatMontant(projet.bons_commande.reduce((s, b) => s + b.montant_total, 0))}</p>
        <p>Sous-traitance : {formatMontant(projet.contrats_sous_traitance.reduce((s, c) => s + c.montant_total, 0))}</p>
      </div>
    </div>
  );
}

function Chiffrage({ projet }) {
  const [detail, setDetail] = useState(null);
  const chiffrageActuel = projet.chiffrages[0];

  useEffect(() => {
    if (chiffrageActuel) api.get(`/chiffrages/${chiffrageActuel.id}`).then((res) => setDetail(res.data));
  }, [chiffrageActuel?.id]);

  if (!chiffrageActuel) return <p className="text-sm text-concrete">Aucun chiffrage pour ce projet.</p>;
  if (!detail) return <p className="text-sm text-concrete">Chargement...</p>;

  return (
    <div className="card bg-white border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-medium">Version {chiffrageActuel.version}</p>
        <Badge {...(STATUT_CHIFFRAGE[chiffrageActuel.statut] || { label: chiffrageActuel.statut, tone: 'warn' })} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
            <th className="text-left font-normal px-4 py-2.5">Designation</th>
            <th className="text-left font-normal px-4 py-2.5">Unite</th>
            <th className="text-left font-normal px-4 py-2.5">Quantite</th>
            <th className="text-left font-normal px-4 py-2.5">PU</th>
            <th className="text-left font-normal px-4 py-2.5">Montant</th>
          </tr>
        </thead>
        <tbody>
          {detail.postes.map((p) => (
            <tr key={p.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-2.5">{p.designation}</td>
              <td className="px-4 py-2.5 text-concrete">{p.unite}</td>
              <td className="px-4 py-2.5">{p.quantite}</td>
              <td className="px-4 py-2.5">{formatMontant(p.prix_unitaire)}</td>
              <td className="px-4 py-2.5 font-medium">{formatMontant(p.quantite * p.prix_unitaire)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td colSpan={4} className="px-4 py-3 text-right text-concrete">Total</td>
            <td className="px-4 py-3 font-semibold">{formatMontant(detail.montant_total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ===================== CONTROLE BUDGETAIRE (poste par poste) =====================
function ControleBudgetaireProjet({ projetId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/controle-budgetaire/${projetId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Erreur de chargement'));
  }, [projetId]);

  if (error) return <p className="text-sm text-concrete">{error}</p>;
  if (!data) return <p className="text-sm text-concrete">Chargement...</p>;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Budget total</p>
          <p className="text-lg font-semibold">{formatMontant(data.total_budget)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Engage</p>
          <p className="text-lg font-semibold">{formatMontant(data.total_engage)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Ecart</p>
          <p className={`text-lg font-semibold ${data.total_ecart < 0 ? 'text-danger' : 'text-ok'}`}>{formatMontant(data.total_ecart)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Postes en depassement</p>
          <p className={`text-lg font-semibold ${data.postes_en_depassement > 0 ? 'text-danger' : ''}`}>{data.postes_en_depassement}</p>
        </div>
      </div>

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Poste budgetaire</th>
              <th className="text-left font-normal px-4 py-2.5">Budget</th>
              <th className="text-left font-normal px-4 py-2.5">Achats</th>
              <th className="text-left font-normal px-4 py-2.5">Depenses</th>
              <th className="text-left font-normal px-4 py-2.5">Sous-traitance</th>
              <th className="text-left font-normal px-4 py-2.5">Engage</th>
              <th className="text-left font-normal px-4 py-2.5">Ecart</th>
              <th className="text-left font-normal px-4 py-2.5">Taux</th>
            </tr>
          </thead>
          <tbody>
            {data.lignes.map((l) => (
              <tr key={l.poste_id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">
                  <p>{l.designation}</p>
                  <p className="text-xs text-concrete">{l.categorie}</p>
                </td>
                <td className="px-4 py-3">{formatMontant(l.budget)}</td>
                <td className="px-4 py-3 text-concrete">{formatMontant(l.engage_achats)}</td>
                <td className="px-4 py-3 text-concrete">{formatMontant(l.engage_depenses)}</td>
                <td className="px-4 py-3 text-concrete">{formatMontant(l.engage_sous_traitance)}</td>
                <td className="px-4 py-3 font-medium">{formatMontant(l.engage_total)}</td>
                <td className={`px-4 py-3 font-medium ${l.depassement ? 'text-danger' : 'text-ok'}`}>{formatMontant(l.ecart)}</td>
                <td className="px-4 py-3">
                  <div className="w-16 bg-concrete-light rounded-full h-1.5 overflow-hidden inline-block align-middle mr-1.5">
                    <div className={`h-full ${l.depassement ? 'bg-danger' : 'bg-blueprint'}`} style={{ width: `${Math.min(100, l.taux_engagement || 0)}%` }} />
                  </div>
                  <span className="text-xs text-concrete">{l.taux_engagement ?? 0}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.non_affecte > 0 && (
        <p className="text-xs text-concrete mt-3">
          {formatMontant(data.non_affecte)} de depenses/achats/sous-traitance ne sont pas encore affectes a un poste budgetaire precis.
        </p>
      )}
    </div>
  );
}

// ===================== DOCUMENTS (contrats, plans, uploads) =====================
const CATEGORIE_DOCUMENT = {
  contrat: 'Contrat',
  plan: 'Plan',
  photo: 'Photo',
  administratif: 'Administratif',
  autre: 'Autre',
};

function Documents({ projetId }) {
  const [docs, setDocs] = useState([]);
  const [fichier, setFichier] = useState(null);
  const [categorie, setCategorie] = useState('contrat');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function charger() {
    api.get(`/documents-projet?projet_id=${projetId}`).then((res) => setDocs(res.data));
  }

  useEffect(charger, [projetId]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!fichier) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('fichier', fichier);
      formData.append('projet_id', projetId);
      formData.append('categorie', categorie);
      formData.append('nom', fichier.name);
      await api.post('/documents-projet', formData);
      setFichier(null);
      charger();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }

  async function telecharger(doc) {
    const res = await api.get(`/documents-projet/${doc.id}/telecharger`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nom;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function supprimer(id) {
    if (!confirm('Supprimer ce document ?')) return;
    await api.delete(`/documents-projet/${id}`);
    charger();
  }

  return (
    <div>
      <form onSubmit={handleUpload} className="card bg-white border border-border rounded-lg p-4 mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-concrete mb-1">Fichier (PDF, image, Word, Excel — 20 Mo max)</label>
          <input
            type="file"
            onChange={(e) => setFichier(e.target.files[0])}
            className="w-full text-sm border border-border rounded-md px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-concrete mb-1">Categorie</label>
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm">
            {Object.entries(CATEGORIE_DOCUMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button type="submit" disabled={!fichier || uploading} className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40">
          {uploading ? 'Envoi...' : 'Uploader'}
        </button>
      </form>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Nom</th>
              <th className="text-left font-normal px-4 py-2.5">Categorie</th>
              <th className="text-left font-normal px-4 py-2.5">Taille</th>
              <th className="text-left font-normal px-4 py-2.5">Ajoute par</th>
              <th className="text-left font-normal px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{d.nom}</td>
                <td className="px-4 py-3 text-concrete">{CATEGORIE_DOCUMENT[d.categorie]}</td>
                <td className="px-4 py-3 text-concrete">{(d.taille_octets / 1024).toFixed(0)} Ko</td>
                <td className="px-4 py-3 text-concrete">{d.uploade_par_nom || '—'}</td>
                <td className="px-4 py-3 text-concrete">{String(d.date_upload).slice(0, 10)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => telecharger(d)} className="text-blueprint hover:underline text-xs">Telecharger</button>
                  <button onClick={() => supprimer(d.id)} className="text-danger hover:underline text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete">Aucun document. Ajoute le contrat ou les plans du chantier.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContratClient({ projet }) {
  const { user } = useAuth();
  const peutValiderContrat = user?.role === 'admin' || user?.role === 'direction';
  const [contrats, setContrats] = useState([]);
  const [contratId, setContratId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showContratForm, setShowContratForm] = useState(false);
  const [contratForm, setContratForm] = useState({ taux_retenue_garantie: '10', taux_compte_prorata: '0', taux_finition: '0' });
  const [contratLignes, setContratLignes] = useState([{ designation: '', unite: 'u', quantite: '', prix_unitaire: '' }]);

  function chargerListe() {
    api.get(`/contrats?projet_id=${projet.id}`).then((res) => {
      setContrats(res.data);
      if (res.data.length > 0 && !contratId) setContratId(res.data[0].id);
    });
  }

  useEffect(chargerListe, [projet.id]);
  useEffect(() => {
    if (contratId) api.get(`/contrats/${contratId}`).then((res) => setDetail(res.data));
  }, [contratId]);

  function rechargerDetail() {
    if (contratId) api.get(`/contrats/${contratId}`).then((res) => setDetail(res.data));
  }

  async function creerContrat(e) {
    e.preventDefault();
    try {
      const res = await api.post('/contrats', {
        projet_id: projet.id,
        taux_retenue_garantie: Number(contratForm.taux_retenue_garantie) || 0,
        taux_compte_prorata: Number(contratForm.taux_compte_prorata) || 0,
        taux_finition: Number(contratForm.taux_finition) || 0,
        lignes: contratLignes.filter((l) => l.designation).map((l) => ({ ...l, quantite: Number(l.quantite) || 0, prix_unitaire: Number(l.prix_unitaire) || 0 })),
      });
      setShowContratForm(false);
      setContratLignes([{ designation: '', unite: 'u', quantite: '', prix_unitaire: '' }]);
      chargerListe();
      setContratId(res.data.id);
    } catch (err) { alert(err.response?.data?.error || 'Erreur lors de la creation du contrat'); }
  }

  if (contrats.length === 0 && !showContratForm) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-concrete mb-3">Aucun contrat client pour ce chantier.</p>
        <button onClick={() => setShowContratForm(true)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
          + Creer le contrat (bordereau de prix)
        </button>
      </div>
    );
  }

  if (showContratForm) {
    return (
      <form onSubmit={creerContrat} className="card bg-white border border-border rounded-lg p-5 space-y-4 max-w-3xl">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Retenue de garantie (%)</label>
            <input type="number" value={contratForm.taux_retenue_garantie} onChange={(e) => setContratForm({ ...contratForm, taux_retenue_garantie: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Compte prorata (%)</label>
            <input type="number" value={contratForm.taux_compte_prorata} onChange={(e) => setContratForm({ ...contratForm, taux_compte_prorata: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Finition (%)</label>
            <input type="number" value={contratForm.taux_finition} onChange={(e) => setContratForm({ ...contratForm, taux_finition: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-concrete mb-2">Bordereau de prix (prestations)</p>
          <div className="space-y-2">
            {contratLignes.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_120px] gap-2">
                <input placeholder="Designation" value={l.designation} onChange={(e) => setContratLignes((p) => p.map((x, idx) => idx === i ? { ...x, designation: e.target.value } : x))} className="border border-border rounded-md px-3 py-1.5 text-sm" />
                <input placeholder="Unite" value={l.unite} onChange={(e) => setContratLignes((p) => p.map((x, idx) => idx === i ? { ...x, unite: e.target.value } : x))} className="border border-border rounded-md px-3 py-1.5 text-sm" />
                <input type="number" placeholder="Qte" value={l.quantite} onChange={(e) => setContratLignes((p) => p.map((x, idx) => idx === i ? { ...x, quantite: e.target.value } : x))} className="border border-border rounded-md px-3 py-1.5 text-sm" />
                <input type="number" placeholder="Prix U." value={l.prix_unitaire} onChange={(e) => setContratLignes((p) => p.map((x, idx) => idx === i ? { ...x, prix_unitaire: e.target.value } : x))} className="border border-border rounded-md px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setContratLignes((p) => [...p, { designation: '', unite: 'u', quantite: '', prix_unitaire: '' }])} className="text-xs text-blueprint hover:underline mt-2">
            + Ajouter une ligne
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setShowContratForm(false)} className="text-sm px-4 py-2 rounded-md border border-border">Annuler</button>
          <button type="submit" className="text-sm px-4 py-2 rounded-md bg-blueprint text-white hover:bg-blueprint-light">Creer le contrat</button>
        </div>
      </form>
    );
  }

  if (!detail) return <p className="text-sm text-concrete">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">{detail.reference} · v{detail.version}</p>
          <div className="flex items-center gap-3">
            {detail.statut === 'brouillon' && peutValiderContrat && (
              <button
                onClick={async () => {
                  try { await api.put(`/contrats/${detail.id}/valider`); rechargerDetail(); }
                  catch (err) { alert(err.response?.data?.error || 'Erreur lors de la validation'); }
                }}
                className="text-xs text-blueprint hover:underline"
              >
                Valider le contrat
              </button>
            )}
            <Badge {...(STATUT_CONTRAT_CLIENT[detail.statut] || { label: detail.statut, tone: 'warn' })} />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2">Prestation</th>
              <th className="text-left font-normal px-4 py-2">Qte</th>
              <th className="text-left font-normal px-4 py-2">PU</th>
              <th className="text-left font-normal px-4 py-2">Montant</th>
            </tr>
          </thead>
          <tbody>
            {detail.lignes.map((l) => (
              <tr key={l.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2">{l.designation}</td>
                <td className="px-4 py-2">{l.quantite} {l.unite}</td>
                <td className="px-4 py-2">{formatMontant(l.prix_unitaire)}</td>
                <td className="px-4 py-2 font-medium">{formatMontant(l.quantite * l.prix_unitaire)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td colSpan={3} className="px-4 py-2 text-right text-concrete">Total marche</td>
              <td className="px-4 py-2 font-semibold">{formatMontant(detail.montant_total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Attachements contrat={detail} onUpdate={rechargerDetail} />
    </div>
  );
}

function Attachements({ contrat, onUpdate }) {
  const { user } = useAuth();
  const peutValiderAttachement = user?.role === 'admin' || user?.role === 'chef_projet';
  const peutGererDecompte = ['admin', 'chef_projet', 'comptable'].includes(user?.role);
  const peutFacturer = user?.role === 'admin' || user?.role === 'comptable';
  const [attachements, setAttachements] = useState([]);
  const [decomptes, setDecomptes] = useState([]);
  const [factures, setFactures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [quantites, setQuantites] = useState({});

  function charger() {
    api.get(`/attachements?contrat_id=${contrat.id}`).then((res) => setAttachements(res.data));
    api.get(`/decomptes?contrat_id=${contrat.id}`).then((res) => setDecomptes(res.data));
    api.get(`/factures-vente?projet_id=${contrat.projet_id}`).then((res) => setFactures(res.data));
  }

  useEffect(charger, [contrat.id]);

  async function creerAttachement(e) {
    e.preventDefault();
    try {
      await api.post('/attachements', {
        contrat_id: contrat.id,
        lignes: contrat.lignes.map((l) => ({ contrat_ligne_id: l.id, quantite_cumulee: Number(quantites[l.id]) || 0 })),
      });
      setShowForm(false);
      setQuantites({});
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function validerAttachement(id) {
    try { await api.put(`/attachements/${id}/valider`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function genererDecompte(attachementId) {
    try { await api.post('/decomptes', { attachement_id: attachementId }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function validerDecompte(id) {
    try { await api.put(`/decomptes/${id}/valider`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function facturer(decompteId) {
    try { await api.post('/factures-vente', { decompte_id: decompteId }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function regler(factureId) {
    const montant = prompt('Montant du reglement (MAD) ?');
    if (!montant) return;
    try { await api.put(`/factures-vente/${factureId}/reglement`, { montant: Number(montant) }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Attachements (constats d'avancement)</p>
          <button onClick={() => setShowForm((v) => !v)} className="text-xs bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
            {showForm ? 'Annuler' : '+ Nouvel attachement'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={creerAttachement} className="card bg-white border border-border rounded-lg p-4 mb-3 space-y-2">
            <p className="text-xs text-concrete">Quantites CUMULEES depuis le debut du chantier (pas l'increment)</p>
            {contrat.lignes.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_120px] gap-2 items-center">
                <span className="text-sm">{l.designation} <span className="text-concrete text-xs">(marche : {l.quantite} {l.unite})</span></span>
                <input
                  type="number"
                  placeholder="Qte cumulee"
                  value={quantites[l.id] || ''}
                  onChange={(e) => setQuantites((p) => ({ ...p, [l.id]: e.target.value }))}
                  className="border border-border rounded-md px-3 py-1.5 text-sm"
                />
              </div>
            ))}
            <button type="submit" className="text-sm bg-safety text-white px-4 py-2 rounded-md hover:opacity-90">Enregistrer l'attachement</button>
          </form>
        )}

        <div className="card bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
                <th className="text-left font-normal px-4 py-2">N°</th>
                <th className="text-left font-normal px-4 py-2">Date</th>
                <th className="text-left font-normal px-4 py-2">Statut</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {attachements.map((a) => (
                <tr key={a.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2">{a.numero}</td>
                  <td className="px-4 py-2 text-concrete">{String(a.date_attachement).slice(0, 10)}</td>
                  <td className="px-4 py-2"><Badge {...(STATUT_ATTACHEMENT[a.statut] || { label: a.statut, tone: 'warn' })} /></td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {a.statut === 'brouillon' && peutValiderAttachement && <button onClick={() => validerAttachement(a.id)} className="text-ok hover:underline text-xs">Valider</button>}
                    {a.statut === 'valide' && peutGererDecompte && !decomptes.some((d) => d.attachement_id === a.id) && (
                      <button onClick={() => genererDecompte(a.id)} className="text-blueprint hover:underline text-xs">Generer decompte</button>
                    )}
                  </td>
                </tr>
              ))}
              {attachements.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-concrete">Aucun attachement.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Decomptes</p>
        <div className="card bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
                <th className="text-left font-normal px-4 py-2">Reference</th>
                <th className="text-left font-normal px-4 py-2">Brut</th>
                <th className="text-left font-normal px-4 py-2">Retenues</th>
                <th className="text-left font-normal px-4 py-2">Net a payer</th>
                <th className="text-left font-normal px-4 py-2">Statut</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {decomptes.map((d) => (
                <tr key={d.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-medium">{d.reference}</td>
                  <td className="px-4 py-2">{formatMontant(d.montant_brut)}</td>
                  <td className="px-4 py-2 text-danger">-{formatMontant(d.montant_retenues)}</td>
                  <td className="px-4 py-2 font-medium">{formatMontant(d.net_a_payer)}</td>
                  <td className="px-4 py-2"><Badge {...(STATUT_DECOMPTE[d.statut] || { label: d.statut, tone: 'warn' })} /></td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {d.statut === 'brouillon' && peutGererDecompte && <button onClick={() => validerDecompte(d.id)} className="text-ok hover:underline text-xs">Valider</button>}
                    {d.statut === 'valide' && peutFacturer && <button onClick={() => facturer(d.id)} className="text-blueprint hover:underline text-xs">Facturer</button>}
                  </td>
                </tr>
              ))}
              {decomptes.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-concrete">Aucun decompte.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Factures de vente</p>
        <div className="card bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
                <th className="text-left font-normal px-4 py-2">Reference</th>
                <th className="text-left font-normal px-4 py-2">Montant</th>
                <th className="text-left font-normal px-4 py-2">Regle</th>
                <th className="text-left font-normal px-4 py-2">Statut</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-medium">{f.reference}</td>
                  <td className="px-4 py-2">{formatMontant(f.montant)}</td>
                  <td className="px-4 py-2">{formatMontant(f.montant_regle)}</td>
                  <td className="px-4 py-2"><Badge {...(STATUT_FACTURE[f.statut] || { label: f.statut, tone: 'warn' })} /></td>
                  <td className="px-4 py-2 text-right">
                    {f.statut !== 'reglee' && peutFacturer && <button onClick={() => regler(f.id)} className="text-blueprint hover:underline text-xs">Enregistrer reglement</button>}
                  </td>
                </tr>
              ))}
              {factures.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-concrete">Aucune facture.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===================== PLANNING =====================
function Planning({ projet }) {
  const [taches, setTaches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ designation: '', date_debut: '', date_fin: '', valeur_planifiee: '' });

  function charger() {
    api.get(`/planning?projet_id=${projet.id}`).then((res) => setTaches(res.data));
  }

  useEffect(charger, [projet.id]);

  async function creer(e) {
    e.preventDefault();
    try {
      await api.post('/planning', { projet_id: projet.id, ...form, valeur_planifiee: Number(form.valeur_planifiee) || 0 });
      setForm({ designation: '', date_debut: '', date_fin: '', valeur_planifiee: '' });
      setShowForm(false);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function majAvancement(t) {
    const pct = prompt('Nouveau % d\'avancement ?', t.avancement_pct);
    if (pct === null) return;
    const valeurRealisee = (t.valeur_planifiee * Number(pct)) / 100;
    try {
      await api.put(`/planning/${t.id}`, { avancement_pct: Number(pct), valeur_realisee: valeurRealisee, statut: Number(pct) >= 100 ? 'termine' : Number(pct) > 0 ? 'en_cours' : 'a_faire' });
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouvelle tache'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-4 gap-3">
          <input required placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-2" />
          <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Valeur planifiee (MAD)" value={form.valeur_planifiee} onChange={(e) => setForm({ ...form, valeur_planifiee: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-4" />
          <button type="submit" className="col-span-4 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Enregistrer</button>
        </form>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Tache</th>
              <th className="text-left font-normal px-4 py-2.5">Periode</th>
              <th className="text-left font-normal px-4 py-2.5">Avancement</th>
              <th className="text-left font-normal px-4 py-2.5">VP / VR</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {taches.map((t) => (
              <tr key={t.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{t.designation}</td>
                <td className="px-4 py-3 text-concrete text-xs">{t.date_debut} → {t.date_fin}</td>
                <td className="px-4 py-3">
                  <div className="w-24 bg-concrete-light rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blueprint h-full" style={{ width: `${t.avancement_pct}%` }} />
                  </div>
                  <span className="text-xs text-concrete">{t.avancement_pct}%</span>
                </td>
                <td className="px-4 py-3 text-xs">{formatMontant(t.valeur_planifiee)} / {formatMontant(t.valeur_realisee)}</td>
                <td className="px-4 py-3"><Badge {...(STATUT_TACHE[t.statut] || { label: t.statut, tone: 'warn' })} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => majAvancement(t)} className="text-blueprint hover:underline text-xs">Mettre a jour</button>
                </td>
              </tr>
            ))}
            {taches.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete">Aucune tache planifiee.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== BONS DE COMMANDE (avec reception) =====================
function BonsCommande({ projet, onUpdate }) {
  const { user } = useAuth();
  const peutValiderSignature = user?.role === 'admin' || user?.role === 'direction';
  const [receptionPourId, setReceptionPourId] = useState(null);
  const [bcDetail, setBcDetail] = useState(null);
  const [quantites, setQuantites] = useState({});

  async function ouvrirReception(bcId) {
    const res = await api.get(`/bons-commande/${bcId}`);
    setBcDetail(res.data);
    setReceptionPourId(bcId);
    setQuantites({});
  }

  async function confirmerReception(e) {
    e.preventDefault();
    const lignes = bcDetail.lignes
      .filter((l) => quantites[l.id])
      .map((l) => ({ bon_commande_ligne_id: l.id, quantite_recue: Number(quantites[l.id]) }));
    try {
      await api.post('/bons-livraison', { bon_commande_id: bcDetail.id, lignes });
      setReceptionPourId(null);
      onUpdate();
    } catch (err) { alert(err.response?.data?.error || 'Erreur lors de la reception'); }
  }

  async function valider(bcId) {
    try {
      await api.put(`/bons-commande/${bcId}/valider`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la validation');
    }
  }

  async function envoyerEmail(bcId) {
    const res = await api.get(`/bons-commande/${bcId}`);
    const bc = res.data;
    if (!bc.fournisseur_email) {
      alert('Aucun email renseigne pour ce fournisseur. Complete sa fiche dans "Fournisseurs & sous-traitants".');
      return;
    }
    const sujet = encodeURIComponent(`Bon de commande ${bc.reference}`);
    const lignesTexte = bc.lignes.map((l) => `- ${l.designation} : ${l.quantite} ${l.unite} x ${l.prix_unitaire} MAD`).join('%0D%0A');
    const corps = `Bonjour,%0D%0A%0D%0AVeuillez trouver ci-joint notre bon de commande ${bc.reference}.%0D%0A%0D%0A${lignesTexte}%0D%0A%0D%0AMontant total : ${bc.montant_total} MAD%0D%0A%0D%0ACordialement`;
    window.location.href = `mailto:${bc.fournisseur_email}?subject=${sujet}&body=${corps}`;
  }

  async function telechargerPdf(bcId, reference) {
    try {
      const res = await api.get(`/bons-commande/${bcId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reference}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erreur lors de la generation du PDF');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Reference</th>
              <th className="text-left font-normal px-4 py-2.5">Fournisseur</th>
              <th className="text-left font-normal px-4 py-2.5">Montant</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {projet.bons_commande.map((b) => (
              <tr key={b.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{b.reference}</td>
                <td className="px-4 py-3">{b.fournisseur_nom || '—'}</td>
                <td className="px-4 py-3">{formatMontant(b.montant_total)}</td>
                <td className="px-4 py-3"><Badge {...(STATUT_BC[b.statut] || { label: b.statut, tone: 'warn' })} /></td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => telechargerPdf(b.id, b.reference)} className="text-concrete hover:text-ink hover:underline text-xs">PDF</button>
                  {b.statut === 'brouillon' && peutValiderSignature && <button onClick={() => valider(b.id)} className="text-blueprint hover:underline text-xs">Valider (signature)</button>}
                  {(b.statut === 'envoye' || b.statut === 'partiellement_recu') && (
                    <button onClick={() => envoyerEmail(b.id)} className="text-blueprint hover:underline text-xs">Envoyer par email</button>
                  )}
                  {(b.statut === 'envoye' || b.statut === 'partiellement_recu') && (
                    <button onClick={() => ouvrirReception(b.id)} className="text-ok hover:underline text-xs">Receptionner</button>
                  )}
                </td>
              </tr>
            ))}
            {projet.bons_commande.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-concrete">Aucun bon de commande.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {receptionPourId && bcDetail && (
        <form onSubmit={confirmerReception} className="card bg-white border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Reception - {bcDetail.reference}</p>
          {bcDetail.lignes.map((l) => (
            <div key={l.id} className="grid grid-cols-[1fr_140px] gap-2 items-center">
              <span className="text-sm">{l.designation} <span className="text-xs text-concrete">(commande : {l.quantite}, deja recu : {l.quantite_recue})</span></span>
              <input
                type="number"
                placeholder="Qte recue"
                value={quantites[l.id] || ''}
                onChange={(e) => setQuantites((p) => ({ ...p, [l.id]: e.target.value }))}
                className="border border-border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setReceptionPourId(null)} className="text-sm px-4 py-2 rounded-md border border-border">Annuler</button>
            <button type="submit" className="text-sm px-4 py-2 rounded-md bg-safety text-white hover:opacity-90">Confirmer la reception</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ===================== SOUS-TRAITANCE (avec situations, decomptes, factures) =====================
function SousTraitance({ projet }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="card bg-white border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
            <th className="text-left font-normal px-4 py-2.5">Reference</th>
            <th className="text-left font-normal px-4 py-2.5">Sous-traitant</th>
            <th className="text-left font-normal px-4 py-2.5">Nature des travaux</th>
            <th className="text-left font-normal px-4 py-2.5">Montant</th>
            <th className="text-left font-normal px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {projet.contrats_sous_traitance.map((c) => (
            <>
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-medium">{c.reference}</td>
                <td className="px-4 py-3">{c.sous_traitant_nom}</td>
                <td className="px-4 py-3 text-concrete">{c.nature_travaux || '—'}</td>
                <td className="px-4 py-3">{formatMontant(c.montant_total)}</td>
                <td className="px-4 py-3"><Badge {...(STATUT_CONTRAT[c.statut] || { label: c.statut, tone: 'warn' })} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="text-blueprint hover:underline text-xs">
                    {expanded === c.id ? 'Fermer' : 'Situations & factures'}
                  </button>
                </td>
              </tr>
              {expanded === c.id && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 bg-concrete-light/40">
                    <SituationsSousTraitant contrat={c} />
                  </td>
                </tr>
              )}
            </>
          ))}
          {projet.contrats_sous_traitance.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete">Aucun contrat de sous-traitance.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SituationsSousTraitant({ contrat }) {
  const { user } = useAuth();
  const peutCreerSituation = ['admin', 'chef_projet', 'conducteur_travaux'].includes(user?.role);
  const peutValiderSituation = ['admin', 'chef_projet', 'comptable'].includes(user?.role);
  const peutGererDecompte = ['admin', 'chef_projet', 'comptable'].includes(user?.role);
  const peutFacturer = user?.role === 'admin' || user?.role === 'comptable';
  const [situations, setSituations] = useState([]);
  const [decomptes, setDecomptes] = useState([]);
  const [factures, setFactures] = useState([]);
  const [form, setForm] = useState({ pourcentage_avancement: '', montant: '' });

  function charger() {
    api.get(`/contrats-sous-traitance/${contrat.id}`).then((res) => setSituations(res.data.situations || []));
    api.get(`/decomptes-sous-traitant?contrat_id=${contrat.id}`).then((res) => setDecomptes(res.data));
    api.get(`/factures-sous-traitant?contrat_id=${contrat.id}`).then((res) => setFactures(res.data));
  }

  useEffect(charger, [contrat.id]);

  async function creerSituation(e) {
    e.preventDefault();
    try {
      await api.post(`/contrats-sous-traitance/${contrat.id}/situations`, {
        pourcentage_avancement: Number(form.pourcentage_avancement) || 0,
        montant: Number(form.montant) || 0,
      });
      setForm({ pourcentage_avancement: '', montant: '' });
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function validerSituation(id) {
    try { await api.put(`/contrats-sous-traitance/situations/${id}`, { statut: 'validee' }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function genererDecompte(situationId) {
    try { await api.post('/decomptes-sous-traitant', { situation_id: situationId }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function validerDecompte(id) {
    try { await api.put(`/decomptes-sous-traitant/${id}/valider`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function facturer(decompteId) {
    try { await api.post('/factures-sous-traitant', { decompte_id: decompteId }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function regler(factureId) {
    const montant = prompt('Montant du reglement (MAD) ?');
    if (!montant) return;
    try { await api.put(`/factures-sous-traitant/${factureId}/reglement`, { montant: Number(montant) }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="space-y-4 text-sm">
      {peutCreerSituation && (
        <form onSubmit={creerSituation} className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-concrete mb-1">% avancement</label>
            <input type="number" value={form.pourcentage_avancement} onChange={(e) => setForm({ ...form, pourcentage_avancement: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm w-28" />
          </div>
          <div>
            <label className="block text-xs text-concrete mb-1">Montant (MAD)</label>
            <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm w-32" />
          </div>
          <button type="submit" className="bg-blueprint text-white px-3 py-1.5 rounded-md text-xs hover:bg-blueprint-light">+ Nouvelle situation</button>
        </form>
      )}

      <div>
        <p className="font-medium mb-1.5">Situations</p>
        <table className="w-full bg-white rounded-md overflow-hidden">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-3 py-1.5">N°</th><th className="text-left font-normal px-3 py-1.5">%</th><th className="text-left font-normal px-3 py-1.5">Montant</th><th className="text-left font-normal px-3 py-1.5">Statut</th><th></th></tr></thead>
          <tbody>
            {situations.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-1.5">{s.numero}</td>
                <td className="px-3 py-1.5">{s.pourcentage_avancement}%</td>
                <td className="px-3 py-1.5">{formatMontant(s.montant)}</td>
                <td className="px-3 py-1.5"><Badge {...(STATUT_SITUATION[s.statut] || { label: s.statut, tone: 'warn' })} /></td>
                <td className="px-3 py-1.5 text-right space-x-2">
                  {s.statut === 'brouillon' && peutValiderSituation && <button onClick={() => validerSituation(s.id)} className="text-ok hover:underline text-xs">Valider</button>}
                  {s.statut === 'validee' && peutGererDecompte && !decomptes.some((d) => d.situation_id === s.id) && (
                    <button onClick={() => genererDecompte(s.id)} className="text-blueprint hover:underline text-xs">Decompte</button>
                  )}
                </td>
              </tr>
            ))}
            {situations.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-center text-concrete">Aucune situation.</td></tr>}
          </tbody>
        </table>
      </div>

      <div>
        <p className="font-medium mb-1.5">Decomptes</p>
        <table className="w-full bg-white rounded-md overflow-hidden">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-3 py-1.5">Reference</th><th className="text-left font-normal px-3 py-1.5">Net a payer</th><th className="text-left font-normal px-3 py-1.5">Statut</th><th></th></tr></thead>
          <tbody>
            {decomptes.map((d) => (
              <tr key={d.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-1.5 font-medium">{d.reference}</td>
                <td className="px-3 py-1.5">{formatMontant(d.net_a_payer)}</td>
                <td className="px-3 py-1.5"><Badge {...(STATUT_DECOMPTE[d.statut] || { label: d.statut, tone: 'warn' })} /></td>
                <td className="px-3 py-1.5 text-right space-x-2">
                  {d.statut === 'brouillon' && peutGererDecompte && <button onClick={() => validerDecompte(d.id)} className="text-ok hover:underline text-xs">Valider</button>}
                  {d.statut === 'valide' && peutFacturer && <button onClick={() => facturer(d.id)} className="text-blueprint hover:underline text-xs">Facturer</button>}
                </td>
              </tr>
            ))}
            {decomptes.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-concrete">Aucun decompte.</td></tr>}
          </tbody>
        </table>
      </div>

      <div>
        <p className="font-medium mb-1.5">Factures</p>
        <table className="w-full bg-white rounded-md overflow-hidden">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-3 py-1.5">Reference</th><th className="text-left font-normal px-3 py-1.5">Montant</th><th className="text-left font-normal px-3 py-1.5">Regle</th><th className="text-left font-normal px-3 py-1.5">Statut</th><th></th></tr></thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-1.5 font-medium">{f.reference}</td>
                <td className="px-3 py-1.5">{formatMontant(f.montant)}</td>
                <td className="px-3 py-1.5">{formatMontant(f.montant_regle)}</td>
                <td className="px-3 py-1.5"><Badge {...(STATUT_FACTURE[f.statut] || { label: f.statut, tone: 'warn' })} /></td>
                <td className="px-3 py-1.5 text-right">
                  {f.statut !== 'reglee' && peutFacturer && <button onClick={() => regler(f.id)} className="text-blueprint hover:underline text-xs">Reglement</button>}
                </td>
              </tr>
            ))}
            {factures.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-center text-concrete">Aucune facture.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== VALIDATION MATERIAUX (circuit sequentiel) =====================
function ValidationMateriaux({ projetId }) {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ designation: '', fournisseur_suggere: '' });

  function charger() {
    api.get(`/validations-materiaux?projet_id=${projetId}`).then((res) => setListe(res.data));
  }

  useEffect(charger, [projetId]);

  async function creer(e) {
    e.preventDefault();
    try {
      await api.post('/validations-materiaux', { projet_id: projetId, ...form });
      setForm({ designation: '', fournisseur_suggere: '' });
      setShowForm(false);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function traiterEtape(etapeId, statut) {
    if (statut === 'rejete') {
      const commentaire = prompt('Motif du rejet ?');
      if (commentaire === null) return;
      try { await api.put(`/validations-materiaux/etapes/${etapeId}`, { statut, commentaire }); charger(); }
      catch (err) { alert(err.response?.data?.error || 'Erreur'); }
    } else {
      try { await api.put(`/validations-materiaux/etapes/${etapeId}`, { statut }); charger(); }
      catch (err) { alert(err.response?.data?.error || 'Erreur'); }
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Soumettre un materiau'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-2 gap-3">
          <input required placeholder="Designation du materiau" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input placeholder="Fournisseur suggere" value={form.fournisseur_suggere} onChange={(e) => setForm({ ...form, fournisseur_suggere: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <button type="submit" className="col-span-2 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">
            Soumettre au circuit (client → architecte → bureau d'etudes → achats)
          </button>
        </form>
      )}

      <div className="space-y-3">
        {liste.map((v) => (
          <div key={v.id} className="card bg-white border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">{v.designation}</p>
                {v.fournisseur_suggere && <p className="text-xs text-concrete">{v.fournisseur_suggere}</p>}
              </div>
              <Badge {...(STATUT_VALIDATION_MATERIAU[v.statut] || { label: v.statut, tone: 'warn' })} />
            </div>
            <div className="flex items-center gap-2">
              {v.etapes.map((e, i) => {
                const estCourante = e.statut === 'en_attente' && v.etapes.slice(0, i).every((prev) => prev.statut === 'approuve');
                return (
                  <div key={e.id} className="flex items-center gap-2">
                    <div className={`px-3 py-2 rounded-md border text-xs ${
                      e.statut === 'approuve' ? 'border-ok/30 bg-ok-light' : e.statut === 'rejete' ? 'border-danger/30 bg-danger-light' : estCourante ? 'border-blueprint/40 bg-blueprint/5' : 'border-border bg-concrete-light/40'
                    }`}>
                      <p className="font-medium">{LABEL_ETAPE[e.etape]}</p>
                      <Badge {...(STATUT_ETAPE[e.statut] || { label: e.statut, tone: 'warn' })} />
                      {estCourante && (
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => traiterEtape(e.id, 'approuve')} className="text-ok hover:underline text-xs">Approuver</button>
                          <button onClick={() => traiterEtape(e.id, 'rejete')} className="text-danger hover:underline text-xs">Rejeter</button>
                        </div>
                      )}
                    </div>
                    {i < v.etapes.length - 1 && <span className="text-concrete text-xs">→</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {liste.length === 0 && <p className="text-sm text-concrete text-center py-8">Aucune soumission de materiau.</p>}
      </div>
    </div>
  );
}

function Depenses({ projet, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categorie: 'main_oeuvre', designation: '', montant: '', chiffrage_poste_id: '' });
  const postes = projet.chiffrages[0]?.postes || [];
  const [postesDetail, setPostesDetail] = useState([]);

  useEffect(() => {
    const chiffrageActuel = projet.chiffrages[0];
    if (chiffrageActuel) api.get(`/chiffrages/${chiffrageActuel.id}`).then((res) => setPostesDetail(res.data.postes));
  }, [projet.chiffrages]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/depenses', { projet_id: projet.id, ...form, montant: Number(form.montant) || 0, chiffrage_poste_id: form.chiffrage_poste_id || null });
      setForm({ categorie: 'main_oeuvre', designation: '', montant: '', chiffrage_poste_id: '' });
      setShowForm(false);
      onUpdate();
    } catch (err) { alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light transition-colors"
        >
          {showForm ? 'Annuler' : '+ Ajouter une depense'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <select
            value={form.categorie}
            onChange={(e) => setForm({ ...form, categorie: e.target.value })}
            className="border border-border rounded-md px-3 py-2 text-sm"
          >
            {Object.entries(CATEGORIE_DEPENSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            required
            placeholder="Designation"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
            className="border border-border rounded-md px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            placeholder="Montant (MAD)"
            value={form.montant}
            onChange={(e) => setForm({ ...form, montant: e.target.value })}
            className="border border-border rounded-md px-3 py-2 text-sm"
          />
          <select
            value={form.chiffrage_poste_id}
            onChange={(e) => setForm({ ...form, chiffrage_poste_id: e.target.value })}
            className="border border-border rounded-md px-3 py-2 text-sm col-span-3"
          >
            <option value="">Poste budgetaire non affecte</option>
            {postesDetail.map((p) => <option key={p.id} value={p.id}>{p.designation}</option>)}
          </select>
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90 transition-opacity">
            Enregistrer la depense
          </button>
        </form>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Designation</th>
              <th className="text-left font-normal px-4 py-2.5">Categorie</th>
              <th className="text-left font-normal px-4 py-2.5">Date</th>
              <th className="text-left font-normal px-4 py-2.5">Montant</th>
            </tr>
          </thead>
          <tbody>
            {projet.depenses.map((d) => (
              <tr key={d.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{d.designation}</td>
                <td className="px-4 py-3 text-concrete">{CATEGORIE_DEPENSE[d.categorie]}</td>
                <td className="px-4 py-3 text-concrete">{String(d.date_depense).slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium">{formatMontant(d.montant)}</td>
              </tr>
            ))}
            {projet.depenses.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete">Aucune depense enregistree.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
