import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatMontant, STATUT_AO } from '../lib/format';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = { materiaux: 'Materiaux', main_oeuvre: 'Main d\'oeuvre', sous_traitance: 'Sous-traitance', materiel: 'Materiel', autre: 'Autre' };

export default function AppelsOffre() {
  const { user } = useAuth();
  const peutValider = user?.role === 'admin' || user?.role === 'direction';
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', client: '', coefficient: '1', marge_pct: '' });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [ligneForm, setLigneForm] = useState({ designation: '', categorie: 'materiaux', unite: 'u', quantite: '', cout_unitaire: '', prix_vente_unitaire: '' });
  const [resultat, setResultat] = useState(null);
  const [error, setError] = useState('');

  function charger() {
    api.get('/appels-offre').then((res) => setListe(res.data));
  }

  useEffect(charger, []);

  useEffect(() => {
    if (selected) api.get(`/appels-offre/${selected}`).then((res) => setDetail(res.data));
  }, [selected]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/appels-offre', { ...form, coefficient: Number(form.coefficient) || 1, marge_pct: Number(form.marge_pct) || 0 });
      setForm({ nom: '', client: '', coefficient: '1', marge_pct: '' });
      setShowForm(false);
      charger();
      setSelected(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  }

  async function ajouterLigne(e) {
    e.preventDefault();
    try {
      await api.post(`/appels-offre/${selected}/lignes`, {
        ...ligneForm,
        quantite: Number(ligneForm.quantite) || 0,
        cout_unitaire: Number(ligneForm.cout_unitaire) || 0,
        prix_vente_unitaire: Number(ligneForm.prix_vente_unitaire) || 0,
      });
      setLigneForm({ designation: '', categorie: 'materiaux', unite: 'u', quantite: '', cout_unitaire: '', prix_vente_unitaire: '' });
      api.get(`/appels-offre/${selected}`).then((res) => setDetail(res.data));
    } catch (err) { alert(err.response?.data?.error || 'Erreur lors de l\'ajout de la ligne'); }
  }

  async function valider() {
    setError('');
    try {
      const res = await api.put(`/appels-offre/${selected}/valider`);
      setResultat(res.data);
      charger();
      setDetail((d) => ({ ...d, statut: 'valide' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la validation');
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appels d'offre</h1>
          <p className="text-sm text-concrete mt-0.5">Chiffrage des prestations. La validation cree automatiquement le chantier, le contrat et le budget initial.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
          {showForm ? 'Annuler' : '+ Nouvel appel d\'offre'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card bg-white border border-border rounded-lg p-5 mb-6 grid grid-cols-4 gap-3">
          <input required placeholder="Nom du projet" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-2" />
          <input placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Coefficient" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          {error && <p className="col-span-4 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-4 bg-blueprint text-white text-sm py-2 rounded-md hover:bg-blueprint-light">Creer</button>
        </form>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="card bg-white border border-border rounded-lg overflow-hidden self-start">
          {liste.map((ao) => (
            <button
              key={ao.id}
              onClick={() => { setSelected(ao.id); setResultat(null); setError(''); }}
              className={`w-full text-left px-4 py-3 text-sm border-b border-black/5 last:border-0 hover:bg-concrete-light/60 ${selected === ao.id ? 'bg-concrete-light' : ''}`}
            >
              <p className="font-medium">{ao.nom}</p>
              <p className="text-xs text-concrete mt-0.5">{ao.reference}</p>
              <Badge {...(STATUT_AO[ao.statut] || { label: ao.statut, tone: 'warn' })} />
            </button>
          ))}
          {liste.length === 0 && <p className="px-4 py-6 text-sm text-concrete">Aucun appel d'offre.</p>}
        </div>

        <div>
          {!detail && <p className="text-sm text-concrete">Selectionne un appel d'offre pour voir le detail.</p>}
          {detail && (
            <div className="card bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{detail.nom}</p>
                  <p className="text-xs text-concrete">{detail.reference} · {detail.client || 'client non precise'}</p>
                </div>
                <Badge {...(STATUT_AO[detail.statut] || { label: detail.statut, tone: 'warn' })} />
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
                    <th className="text-left font-normal py-2">Designation</th>
                    <th className="text-left font-normal py-2">Categorie</th>
                    <th className="text-left font-normal py-2">Qte</th>
                    <th className="text-left font-normal py-2">Cout U.</th>
                    <th className="text-left font-normal py-2">Prix vente U.</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lignes.map((l) => (
                    <tr key={l.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2">{l.designation}</td>
                      <td className="py-2 text-concrete">{CATEGORIES[l.categorie]}</td>
                      <td className="py-2">{l.quantite} {l.unite}</td>
                      <td className="py-2">{formatMontant(l.cout_unitaire)}</td>
                      <td className="py-2">{formatMontant(l.prix_vente_unitaire)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-medium">
                    <td colSpan={3} className="py-2 text-right text-concrete">Total</td>
                    <td className="py-2">{formatMontant(detail.montant_cout)}</td>
                    <td className="py-2">{formatMontant(detail.montant_prix_vente)}</td>
                  </tr>
                </tfoot>
              </table>

              {detail.statut !== 'valide' && (
                <>
                  <form onSubmit={ajouterLigne} className="grid grid-cols-6 gap-2 mb-4 bg-concrete-light/50 p-3 rounded-md">
                    <input required placeholder="Designation" value={ligneForm.designation} onChange={(e) => setLigneForm({ ...ligneForm, designation: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-sm col-span-2" />
                    <select value={ligneForm.categorie} onChange={(e) => setLigneForm({ ...ligneForm, categorie: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-sm">
                      {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input placeholder="Qte" type="number" value={ligneForm.quantite} onChange={(e) => setLigneForm({ ...ligneForm, quantite: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-sm" />
                    <input placeholder="Cout U." type="number" value={ligneForm.cout_unitaire} onChange={(e) => setLigneForm({ ...ligneForm, cout_unitaire: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-sm" />
                    <input placeholder="Prix vente U." type="number" value={ligneForm.prix_vente_unitaire} onChange={(e) => setLigneForm({ ...ligneForm, prix_vente_unitaire: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-sm" />
                    <button type="submit" className="col-span-6 text-xs bg-blueprint text-white rounded-md py-1.5 hover:bg-blueprint-light">+ Ajouter la ligne</button>
                  </form>

                  {error && <p className="text-sm text-danger mb-3">{error}</p>}
                  {peutValider ? (
                    <button
                      onClick={valider}
                      disabled={detail.lignes.length === 0}
                      className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40"
                    >
                      Valider → creer le chantier, le contrat et le budget
                    </button>
                  ) : (
                    <p className="text-xs text-concrete">Seuls la direction ou un admin peuvent valider un appel d'offre.</p>
                  )}
                </>
              )}

              {resultat && (
                <div className="mt-4 bg-ok-light border border-ok/20 rounded-lg p-4 text-sm">
                  <p className="font-medium text-ok">Chantier cree : {resultat.projet.nom}</p>
                  <p className="text-concrete mt-1">Budget initial : {formatMontant(resultat.projet.budget_prevu)} · Contrat : {resultat.contrat.reference}</p>
                  <Link to={`/projets/${resultat.projet.id}`} className="text-blueprint hover:underline text-sm mt-2 inline-block">Voir la fiche chantier →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
