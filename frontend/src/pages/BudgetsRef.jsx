import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant } from '../lib/format';

const TABS = ['Postes budgetaires', 'Bibliotheque de couts', 'Types de prestation'];
const CATEGORIE_LABEL = { achats: 'Achats', main_oeuvre: 'Main d\'oeuvre', frais_chantier: 'Frais de chantier', charges_indirectes: 'Charges indirectes' };

export default function BudgetsRef() {
  const [tab, setTab] = useState('Postes budgetaires');

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Budgets — referentiels</h1>
        <p className="text-sm text-concrete mt-0.5">Plan de postes, bibliotheques de couts et prestations types, reutilisables entre chantiers</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t ? 'border-safety text-ink font-medium' : 'border-transparent text-concrete hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Postes budgetaires' && <PostesBudgetaires />}
      {tab === 'Bibliotheque de couts' && <BibliothequeCouts />}
      {tab === 'Types de prestation' && <TypesPrestation />}
    </div>
  );
}

function PostesBudgetaires() {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', nom: '', categorie: 'achats' });
  const [error, setError] = useState('');

  function charger() { api.get('/budgets-ref/postes-budgetaires').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/budgets-ref/postes-budgetaires', form);
      setForm({ code: '', nom: '', categorie: 'achats' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau poste'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input required placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
            {Object.entries(CATEGORIE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Code</th><th className="text-left font-normal px-4 py-2.5">Nom</th><th className="text-left font-normal px-4 py-2.5">Categorie</th></tr></thead>
          <tbody>
            {liste.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{p.code}</td>
                <td className="px-4 py-3">{p.nom}</td>
                <td className="px-4 py-3 text-concrete">{CATEGORIE_LABEL[p.categorie]}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-concrete">Aucun poste.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BibliothequeCouts() {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ designation: '', type: 'materiel', unite: 'u', cout_unitaire: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/budgets-ref/bibliotheque-couts').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/budgets-ref/bibliotheque-couts', { ...form, cout_unitaire: Number(form.cout_unitaire) || 0 });
      setForm({ designation: '', type: 'materiel', unite: 'u', cout_unitaire: '' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau cout unitaire'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-4 gap-3">
          <input required placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm col-span-2" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="materiel">Materiel</option>
            <option value="sous_traitance">Sous-traitance</option>
          </select>
          <input placeholder="Unite" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input required type="number" placeholder="Cout unitaire (MAD)" value={form.cout_unitaire} onChange={(e) => setForm({ ...form, cout_unitaire: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm col-span-4" />
          {error && <p className="col-span-4 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-4 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Designation</th><th className="text-left font-normal px-4 py-2.5">Type</th><th className="text-left font-normal px-4 py-2.5">Cout unitaire</th></tr></thead>
          <tbody>
            {liste.map((b) => (
              <tr key={b.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{b.designation}</td>
                <td className="px-4 py-3 text-concrete">{b.type === 'materiel' ? 'Materiel' : 'Sous-traitance'}</td>
                <td className="px-4 py-3">{formatMontant(b.cout_unitaire)}/{b.unite}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-concrete">Aucun cout enregistre.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypesPrestation() {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', unite: 'm2' });
  const [expandedId, setExpandedId] = useState(null);
  const [ressourceForm, setRessourceForm] = useState({ designation: '', ressource_type: 'materiaux', quantite_par_unite: '', cout_unitaire: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/budgets-ref/types-prestation').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/budgets-ref/types-prestation', form);
      setForm({ nom: '', unite: 'm2' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function ajouterRessource(typeId) {
    try {
      await api.post(`/budgets-ref/types-prestation/${typeId}/ressources`, {
        ...ressourceForm,
        quantite_par_unite: Number(ressourceForm.quantite_par_unite) || 0,
        cout_unitaire: Number(ressourceForm.cout_unitaire) || 0,
      });
      setRessourceForm({ designation: '', ressource_type: 'materiaux', quantite_par_unite: '', cout_unitaire: '' });
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau type de prestation'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input required placeholder="Nom (ex: Revetement sol carrelage)" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm col-span-2" />
          <input placeholder="Unite" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}

      <div className="space-y-3">
        {liste.map((t) => {
          const coutTotal = t.ressources.reduce((s, r) => s + r.quantite_par_unite * r.cout_unitaire, 0);
          return (
            <div key={t.id} className="card bg-white border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{t.nom}</p>
                  <p className="text-xs text-concrete">Cout estime : {formatMontant(coutTotal)} / {t.unite}</p>
                </div>
                <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="text-xs text-blueprint hover:underline">
                  {expandedId === t.id ? 'Fermer' : 'Composition'}
                </button>
              </div>
              {expandedId === t.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <table className="w-full text-sm mb-3">
                    <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal py-1.5">Ressource</th><th className="text-left font-normal py-1.5">Type</th><th className="text-left font-normal py-1.5">Qte/unite</th><th className="text-left font-normal py-1.5">Cout U.</th></tr></thead>
                    <tbody>
                      {t.ressources.map((r) => (
                        <tr key={r.id} className="border-b border-black/5 last:border-0">
                          <td className="py-1.5">{r.designation}</td>
                          <td className="py-1.5 text-concrete">{r.ressource_type === 'materiaux' ? 'Materiaux' : 'Main d\'oeuvre'}</td>
                          <td className="py-1.5">{r.quantite_par_unite}</td>
                          <td className="py-1.5">{formatMontant(r.cout_unitaire)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="grid grid-cols-5 gap-2">
                    <input placeholder="Ressource" value={ressourceForm.designation} onChange={(e) => setRessourceForm({ ...ressourceForm, designation: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-xs col-span-2" />
                    <select value={ressourceForm.ressource_type} onChange={(e) => setRessourceForm({ ...ressourceForm, ressource_type: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-xs">
                      <option value="materiaux">Materiaux</option>
                      <option value="main_oeuvre">Main d'oeuvre</option>
                    </select>
                    <input type="number" placeholder="Qte/unite" value={ressourceForm.quantite_par_unite} onChange={(e) => setRessourceForm({ ...ressourceForm, quantite_par_unite: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-xs" />
                    <input type="number" placeholder="Cout U." value={ressourceForm.cout_unitaire} onChange={(e) => setRessourceForm({ ...ressourceForm, cout_unitaire: e.target.value })} className="border border-border rounded-md px-2 py-1.5 text-xs" />
                  </div>
                  <button onClick={() => ajouterRessource(t.id)} className="text-xs text-blueprint hover:underline mt-2">+ Ajouter cette ressource</button>
                </div>
              )}
            </div>
          );
        })}
        {liste.length === 0 && <p className="text-sm text-concrete text-center py-8">Aucun type de prestation.</p>}
      </div>
    </div>
  );
}
