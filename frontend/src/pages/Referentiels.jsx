import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant } from '../lib/format';

const TABS = ['Clients', 'Entrepots', 'Produits', 'Materiautheque'];

export default function Referentiels() {
  const [tab, setTab] = useState('Clients');

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Referentiels</h1>
        <p className="text-sm text-concrete mt-0.5">Clients, entrepots, produits et materiautheque</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t ? 'border-safety text-ink font-medium' : 'border-transparent text-concrete hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Clients' && <Clients />}
      {tab === 'Entrepots' && <Entrepots />}
      {tab === 'Produits' && <Produits />}
      {tab === 'Materiautheque' && <Materiautheque />}
    </div>
  );
}

function Clients() {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', contact_nom: '', telephone: '', email: '', adresse: '', ice: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/referentiels/clients').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/referentiels/clients', form);
      setForm({ nom: '', contact_nom: '', telephone: '', email: '', adresse: '', ice: '' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau client'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Contact" value={form.contact_nom} onChange={(e) => setForm({ ...form, contact_nom: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Telephone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="ICE" value={form.ice} onChange={(e) => setForm({ ...form, ice: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Nom</th><th className="text-left font-normal px-4 py-2.5">Contact</th><th className="text-left font-normal px-4 py-2.5">Telephone</th><th className="text-left font-normal px-4 py-2.5">Email</th></tr></thead>
          <tbody>
            {liste.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{c.nom}</td>
                <td className="px-4 py-3">{c.contact_nom || '—'}</td>
                <td className="px-4 py-3">{c.telephone || '—'}</td>
                <td className="px-4 py-3">{c.email || '—'}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete">Aucun client.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Entrepots() {
  const [liste, setListe] = useState([]);
  const [projets, setProjets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', adresse: '', projet_id: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/referentiels/entrepots').then((res) => setListe(res.data)); }
  useEffect(() => { charger(); api.get('/projets').then((res) => setProjets(res.data)); }, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/referentiels/entrepots', { ...form, projet_id: form.projet_id || null });
      setForm({ nom: '', adresse: '', projet_id: '' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouvel entrepot'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input required placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <select value={form.projet_id} onChange={(e) => setForm({ ...form, projet_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="">Entrepot central (non rattache)</option>
            {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Nom</th><th className="text-left font-normal px-4 py-2.5">Rattache a</th><th className="text-left font-normal px-4 py-2.5">Adresse</th></tr></thead>
          <tbody>
            {liste.map((e) => (
              <tr key={e.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{e.nom}</td>
                <td className="px-4 py-3 text-concrete">{e.projet_nom || 'Central'}</td>
                <td className="px-4 py-3 text-concrete">{e.adresse || '—'}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-concrete">Aucun entrepot.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Produits() {
  const [liste, setListe] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reference: '', designation: '', famille_id: '', unite: 'u', seuil_alerte: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/referentiels/produits').then((res) => setListe(res.data)); }
  useEffect(() => { charger(); api.get('/referentiels/familles-produits').then((res) => setFamilles(res.data)); }, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/referentiels/produits', { ...form, famille_id: form.famille_id || null, seuil_alerte: Number(form.seuil_alerte) || 0 });
      setForm({ reference: '', designation: '', famille_id: '', unite: 'u', seuil_alerte: '' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau produit'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input required placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Unite" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <select value={form.famille_id} onChange={(e) => setForm({ ...form, famille_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="">Famille...</option>
            {familles.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <input type="number" placeholder="Seuil d'alerte stock" value={form.seuil_alerte} onChange={(e) => setForm({ ...form, seuil_alerte: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Designation</th><th className="text-left font-normal px-4 py-2.5">Famille</th><th className="text-left font-normal px-4 py-2.5">Unite</th><th className="text-left font-normal px-4 py-2.5">Stock total</th></tr></thead>
          <tbody>
            {liste.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{p.designation}</td>
                <td className="px-4 py-3 text-concrete">{p.famille_nom || '—'}</td>
                <td className="px-4 py-3">{p.unite}</td>
                <td className="px-4 py-3">{p.stock_total}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete">Aucun produit.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Materiautheque() {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ designation: '', categorie: '', notes: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/referentiels/materiautheque').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/referentiels/materiautheque', form);
      setForm({ designation: '', categorie: '', notes: '' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau materiau'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input required placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Categorie" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Designation</th><th className="text-left font-normal px-4 py-2.5">Categorie</th><th className="text-left font-normal px-4 py-2.5">Fournisseur</th></tr></thead>
          <tbody>
            {liste.map((m) => (
              <tr key={m.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{m.designation}</td>
                <td className="px-4 py-3 text-concrete">{m.categorie || '—'}</td>
                <td className="px-4 py-3 text-concrete">{m.fournisseur_nom || '—'}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-concrete">Aucun materiau.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
