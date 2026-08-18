import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant, TYPE_POINTAGE } from '../lib/format';
import { useAuth } from '../context/AuthContext';

const TABS = ['Personnel', 'Fonctions', 'Pointage'];

export default function MainOeuvre() {
  const { user } = useAuth();
  const peutGererRh = user?.role === 'admin' || user?.role === 'direction';
  const [tab, setTab] = useState('Personnel');
  const [fonctions, setFonctions] = useState([]);

  useEffect(() => {
    api.get('/fonctions').then((res) => setFonctions(res.data));
  }, [tab]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Main d'oeuvre</h1>
        <p className="text-sm text-concrete mt-0.5">Fonctions, personnel et pointage journalier</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-safety text-ink font-medium' : 'border-transparent text-concrete hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Personnel' && <Personnel fonctions={fonctions} peutGerer={peutGererRh} />}
      {tab === 'Fonctions' && <Fonctions fonctions={fonctions} onUpdate={() => api.get('/fonctions').then((res) => setFonctions(res.data))} peutGerer={peutGererRh} />}
      {tab === 'Pointage' && <Pointage />}
    </div>
  );
}

function Fonctions({ fonctions, onUpdate, peutGerer }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', taux_horaire: '' });
  const [error, setError] = useState('');

  async function creer(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/fonctions', { nom: form.nom, taux_horaire: Number(form.taux_horaire) || 0 });
      setForm({ nom: '', taux_horaire: '' });
      setShowForm(false);
      onUpdate();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      {peutGerer && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
            {showForm ? 'Annuler' : '+ Nouvelle fonction'}
          </button>
        </div>
      )}
      {showForm && peutGerer && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <input required placeholder="Nom de la fonction" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-2" />
          <input required type="number" placeholder="Taux horaire (MAD)" value={form.taux_horaire} onChange={(e) => setForm({ ...form, taux_horaire: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Fonction</th><th className="text-left font-normal px-4 py-2.5">Taux horaire</th></tr></thead>
          <tbody>
            {fonctions.map((f) => (
              <tr key={f.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{f.nom}</td>
                <td className="px-4 py-3">{formatMontant(f.taux_horaire)}/h</td>
              </tr>
            ))}
            {fonctions.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-concrete">Aucune fonction.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Personnel({ fonctions, peutGerer }) {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', cin: '', telephone: '', fonction_id: '', date_embauche: '' });
  const [error, setError] = useState('');

  function charger() {
    api.get('/personnel').then((res) => setListe(res.data));
  }

  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/personnel', form);
      setForm({ nom: '', cin: '', telephone: '', fonction_id: '', date_embauche: '' });
      setShowForm(false);
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      {peutGerer && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
            {showForm ? 'Annuler' : '+ Nouvel employe'}
          </button>
        </div>
      )}
      {showForm && peutGerer && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-2 gap-3">
          <input required placeholder="Nom complet" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <select value={form.fonction_id} onChange={(e) => setForm({ ...form, fonction_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Fonction...</option>
            {fonctions.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <input placeholder="CIN" value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input placeholder="Telephone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="date" value={form.date_embauche} onChange={(e) => setForm({ ...form, date_embauche: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-2" />
          {error && <p className="col-span-2 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-2 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Enregistrer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Nom</th><th className="text-left font-normal px-4 py-2.5">Fonction</th><th className="text-left font-normal px-4 py-2.5">Telephone</th><th className="text-left font-normal px-4 py-2.5">Embauche</th></tr></thead>
          <tbody>
            {liste.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{p.nom}</td>
                <td className="px-4 py-3">{p.fonction_nom || '—'}</td>
                <td className="px-4 py-3 text-concrete">{p.telephone || '—'}</td>
                <td className="px-4 py-3 text-concrete">{p.date_embauche || '—'}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete">Aucun employe.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pointage() {
  const [projets, setProjets] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [projetId, setProjetId] = useState('');
  const [pointages, setPointages] = useState([]);
  const [synthese, setSynthese] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ personnel_id: '', date_pointage: '', type: 'normal', heures_normales: '8', heures_supplementaires: '0' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projets').then((res) => {
      setProjets(res.data);
      if (res.data.length > 0) setProjetId(res.data[0].id);
    });
    api.get('/personnel?actif=1').then((res) => setPersonnel(res.data));
  }, []);

  function charger() {
    if (!projetId) return;
    api.get(`/pointages?projet_id=${projetId}`).then((res) => setPointages(res.data));
    api.get(`/pointages/synthese?projet_id=${projetId}`).then((res) => setSynthese(res.data));
  }

  useEffect(charger, [projetId]);

  async function creer(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/pointages', {
        projet_id: projetId,
        ...form,
        heures_normales: Number(form.heures_normales) || 0,
        heures_supplementaires: Number(form.heures_supplementaires) || 0,
      });
      setForm({ personnel_id: '', date_pointage: '', type: 'normal', heures_normales: '8', heures_supplementaires: '0' });
      setShowForm(false);
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select value={projetId} onChange={(e) => setProjetId(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm">
          {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Saisir un pointage'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <select required value={form.personnel_id} onChange={(e) => setForm({ ...form, personnel_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Employe...</option>
            {personnel.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          <input required type="date" value={form.date_pointage} onChange={(e) => setForm({ ...form, date_pointage: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            {Object.entries(TYPE_POINTAGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" placeholder="Heures normales" value={form.heures_normales} onChange={(e) => setForm({ ...form, heures_normales: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Heures sup." value={form.heures_supplementaires} onChange={(e) => setForm({ ...form, heures_supplementaires: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Enregistrer le pointage</button>
        </form>
      )}

      {synthese && (
        <div className="card bg-white border border-border rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-medium">Synthese cout main d'oeuvre</p>
            <p className="text-sm font-semibold">{formatMontant(synthese.cout_total_projet)}</p>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2">Employe</th><th className="text-left font-normal px-4 py-2">Fonction</th><th className="text-left font-normal px-4 py-2">H. normales</th><th className="text-left font-normal px-4 py-2">H. sup.</th><th className="text-left font-normal px-4 py-2">Cout</th></tr></thead>
            <tbody>
              {synthese.lignes.map((l) => (
                <tr key={l.personnel_id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2">{l.personnel_nom}</td>
                  <td className="px-4 py-2 text-concrete">{l.fonction_nom || '—'}</td>
                  <td className="px-4 py-2">{l.total_heures_normales}h</td>
                  <td className="px-4 py-2">{l.total_heures_supplementaires}h</td>
                  <td className="px-4 py-2 font-medium">{formatMontant(l.cout_total)}</td>
                </tr>
              ))}
              {synthese.lignes.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-concrete">Aucun pointage pour ce chantier.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Date</th><th className="text-left font-normal px-4 py-2.5">Employe</th><th className="text-left font-normal px-4 py-2.5">Type</th><th className="text-left font-normal px-4 py-2.5">Heures</th></tr></thead>
          <tbody>
            {pointages.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 text-concrete">{p.date_pointage}</td>
                <td className="px-4 py-3">{p.personnel_nom}</td>
                <td className="px-4 py-3">{TYPE_POINTAGE[p.type]}</td>
                <td className="px-4 py-3">{p.heures_normales}h {p.heures_supplementaires > 0 && `+ ${p.heures_supplementaires}h sup.`}</td>
              </tr>
            ))}
            {pointages.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete">Aucun pointage.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
