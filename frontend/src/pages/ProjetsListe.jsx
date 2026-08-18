import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatMontant, STATUT_PROJET } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const STATUTS = Object.keys(STATUT_PROJET);

export default function ProjetsListe() {
  const { user } = useAuth();
  const peutCreer = user?.role === 'admin';
  const [projets, setProjets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', client: '', localisation: '', budget_prevu: '', statut: 'en_preparation' });
  const [error, setError] = useState('');

  function charger() {
    api.get('/projets').then((res) => setProjets(res.data));
  }

  useEffect(charger, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projets', { ...form, budget_prevu: Number(form.budget_prevu) || 0 });
      setShowForm(false);
      setForm({ nom: '', client: '', localisation: '', budget_prevu: '', statut: 'en_preparation' });
      charger();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la creation');
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
          <p className="text-sm text-concrete mt-0.5">{projets.length} projet(s)</p>
        </div>
        {peutCreer && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 transition-colors"
          >
            {showForm ? 'Annuler' : '+ Nouveau projet'}
          </button>
        )}
      </div>

      {showForm && peutCreer && (
        <form onSubmit={handleCreate} className="card bg-white border border-border rounded-lg p-5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Nom du projet</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Client</label>
            <input
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Localisation</label>
            <input
              value={form.localisation}
              onChange={(e) => setForm({ ...form, localisation: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Budget prevu (MAD)</label>
            <input
              type="number"
              value={form.budget_prevu}
              onChange={(e) => setForm({ ...form, budget_prevu: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Statut</label>
            <select
              value={form.statut}
              onChange={(e) => setForm({ ...form, statut: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>{STATUT_PROJET[s].label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex items-center justify-between">
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" className="ml-auto bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 transition-colors">
              Creer le projet
            </button>
          </div>
        </form>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Projet</th>
              <th className="text-left font-normal px-4 py-2.5">Client</th>
              <th className="text-left font-normal px-4 py-2.5">Budget</th>
              <th className="text-left font-normal px-4 py-2.5">Depenses</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {projets.map((p) => {
              const engage = p.total_depenses + p.total_bc + p.total_sous_traitance;
              return (
                <tr key={p.id} className="border-b border-black/5 last:border-0 hover:bg-concrete-light/50">
                  <td className="px-4 py-3 font-medium">{p.nom}</td>
                  <td className="px-4 py-3 text-concrete">{p.client || '—'}</td>
                  <td className="px-4 py-3">{formatMontant(p.budget_prevu)}</td>
                  <td className="px-4 py-3">{formatMontant(engage)}</td>
                  <td className="px-4 py-3">
                    <Badge {...(STATUT_PROJET[p.statut] || { label: p.statut, tone: 'warn' })} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/projets/${p.id}`} className="text-blueprint hover:underline text-sm">
                      Voir →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {projets.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete text-sm">Aucun projet pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
