import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const ROLE_LABELS = {
  admin: 'Administrateur', direction: 'Direction', chef_projet: 'Chef de projet',
  conducteur_travaux: 'Conducteur de travaux', metreur: 'Metreur', comptable: 'Comptable', acheteur: 'Acheteur',
};

export default function Utilisateurs() {
  const { user } = useAuth();
  const [liste, setListe] = useState([]);
  const [projets, setProjets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', mot_de_passe: '', role: 'conducteur_travaux' });
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [projetsAffectes, setProjetsAffectes] = useState([]);
  const [projetASelectionner, setProjetASelectionner] = useState('');

  function charger() {
    api.get('/utilisateurs').then((res) => setListe(res.data));
  }

  useEffect(() => {
    charger();
    api.get('/projets').then((res) => setProjets(res.data));
  }, []);

  if (user?.role !== 'admin') {
    return <div className="p-8 max-w-3xl"><p className="text-sm text-concrete">Cette page est reservee a l'administrateur.</p></div>;
  }

  async function creer(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/utilisateurs', form);
      setForm({ nom: '', email: '', mot_de_passe: '', role: 'conducteur_travaux' });
      setShowForm(false);
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function toggleActif(u) {
    try { await api.put(`/utilisateurs/${u.id}`, { actif: u.actif ? 0 : 1 }); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function reinitialiserMotDePasse(u) {
    const nouveauMotDePasse = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
    if (!confirm(`Generer un nouveau mot de passe temporaire pour ${u.nom} ?`)) return;
    try {
      await api.put(`/utilisateurs/${u.id}`, { mot_de_passe: nouveauMotDePasse });
      alert(`Nouveau mot de passe pour ${u.nom} (${u.email}) :\n\n${nouveauMotDePasse}\n\nCommunique-le lui — il ne sera plus jamais affiche.`);
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function ouvrirAffectation(u) {
    if (expandedId === u.id) { setExpandedId(null); return; }
    setExpandedId(u.id);
    const res = await api.get(`/utilisateurs/${u.id}/projets`);
    setProjetsAffectes(res.data);
  }

  async function affecter(userId) {
    if (!projetASelectionner) return;
    try {
      await api.post(`/utilisateurs/${userId}/projets`, { projet_id: projetASelectionner });
      const res = await api.get(`/utilisateurs/${userId}/projets`);
      setProjetsAffectes(res.data);
      setProjetASelectionner('');
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function retirer(userId, projetId) {
    await api.delete(`/utilisateurs/${userId}/projets/${projetId}`);
    const res = await api.get(`/utilisateurs/${userId}/projets`);
    setProjetsAffectes(res.data);
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-concrete mt-0.5">Comptes et affectation aux chantiers</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
          {showForm ? 'Annuler' : '+ Nouvel utilisateur'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-xl p-5 mb-6 grid grid-cols-2 gap-3">
          <input required placeholder="Nom complet" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input required type="password" placeholder="Mot de passe (6 caracteres min)" value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {error && <p className="col-span-2 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-2 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer le compte</button>
        </form>
      )}

      <div className="card bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Nom</th>
              <th className="text-left font-normal px-4 py-2.5">Email</th>
              <th className="text-left font-normal px-4 py-2.5">Role</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((u) => (
              <>
                <tr key={u.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.nom}</td>
                  <td className="px-4 py-3 text-concrete">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-3"><Badge label={u.actif ? 'Actif' : 'Inactif'} tone={u.actif ? 'ok' : 'danger'} /></td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => ouvrirAffectation(u)} className="text-blueprint hover:underline text-xs">Chantiers</button>
                    <button onClick={() => reinitialiserMotDePasse(u)} className="text-safety hover:underline text-xs">Reinitialiser mdp</button>
                    <button onClick={() => toggleActif(u)} className="text-xs hover:underline text-concrete">{u.actif ? 'Desactiver' : 'Activer'}</button>
                  </td>
                </tr>
                {expandedId === u.id && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 bg-concrete-light/40">
                      <p className="text-xs font-medium text-concrete mb-2">Chantiers affectes</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {projetsAffectes.map((p) => (
                          <span key={p.id} className="text-xs bg-white border border-border rounded-md px-2.5 py-1 flex items-center gap-2">
                            {p.nom}
                            <button onClick={() => retirer(u.id, p.id)} className="text-danger hover:underline">×</button>
                          </span>
                        ))}
                        {projetsAffectes.length === 0 && <span className="text-xs text-concrete">Aucun chantier affecte.</span>}
                      </div>
                      <div className="flex gap-2">
                        <select value={projetASelectionner} onChange={(e) => setProjetASelectionner(e.target.value)} className="border border-border rounded-md px-2 py-1.5 text-xs">
                          <option value="">Choisir un chantier...</option>
                          {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                        </select>
                        <button onClick={() => affecter(u.id)} className="text-xs bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">Affecter</button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
