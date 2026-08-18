import { useEffect, useState } from 'react';
import { Building2, Users, FolderKanban, LogIn } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge';

export default function Plateforme() {
  const { entrerDansEntreprise } = useAuth();
  const navigate = useNavigate();
  const [entreprises, setEntreprises] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', slug: '', admin_nom: '', admin_email: '', admin_mot_de_passe: '' });
  const [error, setError] = useState('');
  const [creee, setCreee] = useState(null);

  function charger() {
    api.get('/plateforme/entreprises').then((res) => setEntreprises(res.data));
  }

  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault();
    setError('');
    setCreee(null);
    try {
      const res = await api.post('/plateforme/entreprises', form);
      setCreee(res.data);
      setForm({ nom: '', slug: '', admin_nom: '', admin_email: '', admin_mot_de_passe: '' });
      setShowForm(false);
      charger();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  }

  async function toggleStatut(t) {
    const nouveauStatut = t.statut === 'actif' ? 'suspendu' : 'actif';
    if (nouveauStatut === 'suspendu' && !confirm(`Suspendre "${t.nom}" ? Ses utilisateurs ne pourront plus se connecter.`)) return;
    await api.put(`/plateforme/entreprises/${t.id}`, { statut: nouveauStatut });
    charger();
  }

  async function entrer(t) {
    await entrerDansEntreprise(t.id);
    navigate('/');
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plateforme</h1>
          <p className="text-sm text-concrete mt-0.5">Entreprises clientes — chacune avec ses donnees totalement isolees</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
          {showForm ? 'Annuler' : '+ Nouvelle entreprise cliente'}
        </button>
      </div>

      {creee && (
        <div className="bg-ok-light border border-ok/20 rounded-lg p-4 mb-5 text-sm">
          <p className="font-medium text-ok">Entreprise creee : {creee.nom}</p>
          <p className="text-concrete mt-0.5">Identifiant : {creee.slug} — l'administrateur peut maintenant se connecter avec l'email et le mot de passe fournis.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-xs font-semibold text-concrete uppercase tracking-wide mb-2">Entreprise</p>
          </div>
          <input required placeholder="Nom de l'entreprise" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input placeholder="Identifiant (genere automatiquement si vide)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />

          <div className="col-span-2 mt-2">
            <p className="text-xs font-semibold text-concrete uppercase tracking-wide mb-2">Premier compte administrateur</p>
          </div>
          <input required placeholder="Nom complet" value={form.admin_nom} onChange={(e) => setForm({ ...form, admin_nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input required type="password" placeholder="Mot de passe (6 caracteres min)" value={form.admin_mot_de_passe} onChange={(e) => setForm({ ...form, admin_mot_de_passe: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-2" />

          {error && <p className="col-span-2 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-2 bg-safety text-white text-sm py-2 rounded-lg hover:opacity-90">Creer l'entreprise</button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card bg-white border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-concrete">Entreprises clientes</p>
            <div className="h-8 w-8 rounded-lg bg-blueprint/10 flex items-center justify-center"><Building2 size={16} className="text-blueprint" /></div>
          </div>
          <p className="text-[26px] font-bold tracking-tight">{entreprises.length}</p>
        </div>
        <div className="card bg-white border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-concrete">Actives</p>
            <div className="h-8 w-8 rounded-lg bg-ok-light flex items-center justify-center"><FolderKanban size={16} className="text-ok" /></div>
          </div>
          <p className="text-[26px] font-bold tracking-tight text-ok">{entreprises.filter((e) => e.statut === 'actif').length}</p>
        </div>
        <div className="card bg-white border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-concrete">Utilisateurs totaux</p>
            <div className="h-8 w-8 rounded-lg bg-concrete-light flex items-center justify-center"><Users size={16} className="text-ink" /></div>
          </div>
          <p className="text-[26px] font-bold tracking-tight">{entreprises.reduce((s, e) => s + (e.nb_utilisateurs || 0), 0)}</p>
        </div>
      </div>

      <div className="card bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Entreprise</th>
              <th className="text-left font-normal px-4 py-2.5">Identifiant</th>
              <th className="text-left font-normal px-4 py-2.5">Utilisateurs</th>
              <th className="text-left font-normal px-4 py-2.5">Projets</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {entreprises.map((t) => (
              <tr key={t.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{t.nom}</td>
                <td className="px-4 py-3 text-concrete">{t.slug}</td>
                <td className="px-4 py-3">{t.nb_utilisateurs}</td>
                <td className="px-4 py-3">{t.nb_projets}</td>
                <td className="px-4 py-3"><Badge label={t.statut === 'actif' ? 'Active' : 'Suspendue'} tone={t.statut === 'actif' ? 'ok' : 'danger'} /></td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => entrer(t)} className="text-blueprint hover:underline text-xs inline-flex items-center gap-1">
                    <LogIn size={12} /> Entrer
                  </button>
                  <button onClick={() => toggleStatut(t)} className={`text-xs hover:underline ${t.statut === 'actif' ? 'text-danger' : 'text-ok'}`}>
                    {t.statut === 'actif' ? 'Suspendre' : 'Reactiver'}
                  </button>
                </td>
              </tr>
            ))}
            {entreprises.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete text-sm">Aucune entreprise cliente pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
