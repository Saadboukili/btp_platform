import { useEffect, useState } from 'react';
import api from '../lib/api';

const TYPE_LABELS = {
  fournisseur: 'Fournisseur',
  sous_traitant: 'Sous-traitant',
  les_deux: 'Fournisseur & sous-traitant',
};

const VIDE = { nom: '', type: 'fournisseur', contact_nom: '', telephone: '', email: '', adresse: '', ice: '', rib: '', notes: '' };

export default function Tiers() {
  const [tiers, setTiers] = useState([]);
  const [filtre, setFiltre] = useState('tous');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(VIDE);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  function charger() {
    api.get('/tiers').then((res) => setTiers(res.data));
  }

  useEffect(charger, []);

  const filtres = tiers.filter((t) => {
    if (filtre === 'tous') return true;
    return t.type === filtre || t.type === 'les_deux';
  });

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tiers', form);
      setForm(VIDE);
      setShowForm(false);
      charger();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la creation');
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fournisseurs & sous-traitants</h1>
          <p className="text-sm text-concrete mt-0.5">{filtres.length} contact(s)</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouveau contact'}
        </button>
      </div>

      <div className="flex gap-1 mb-5">
        {[['tous', 'Tous'], ['fournisseur', 'Fournisseurs'], ['sous_traitant', 'Sous-traitants']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFiltre(k)}
            className={`text-xs px-3 py-1.5 rounded-md ${filtre === k ? 'bg-blueprint text-white' : 'bg-concrete-light text-concrete'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card bg-white border border-border rounded-lg p-5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Nom / raison sociale</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Contact</label>
            <input
              value={form.contact_nom}
              onChange={(e) => setForm({ ...form, contact_nom: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Telephone</label>
            <input
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-concrete mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-concrete mb-1">Adresse</label>
            <input
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">ICE</label>
            <input
              value={form.ice}
              onChange={(e) => setForm({ ...form, ice: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">RIB</label>
            <input
              value={form.rib}
              onChange={(e) => setForm({ ...form, rib: e.target.value })}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-concrete mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/40"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between">
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" className="ml-auto bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 transition-colors">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Nom</th>
              <th className="text-left font-normal px-4 py-2.5">Type</th>
              <th className="text-left font-normal px-4 py-2.5">Contact</th>
              <th className="text-left font-normal px-4 py-2.5">Telephone</th>
              <th className="text-left font-normal px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((t) => (
              <>
                <tr key={t.id} className="border-b border-black/5 last:border-0 hover:bg-concrete-light/50">
                  <td className="px-4 py-3 font-medium">{t.nom}</td>
                  <td className="px-4 py-3 text-concrete">{TYPE_LABELS[t.type]}</td>
                  <td className="px-4 py-3">{t.contact_nom || '—'}</td>
                  <td className="px-4 py-3">{t.telephone || '—'}</td>
                  <td className="px-4 py-3">{t.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="text-xs text-blueprint hover:underline">
                      {expandedId === t.id ? 'Fermer' : 'Details'}
                    </button>
                  </td>
                </tr>
                {expandedId === t.id && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 bg-concrete-light/40 text-xs text-concrete">
                      <div className="grid grid-cols-3 gap-3">
                        <p><span className="text-ink font-medium">Adresse : </span>{t.adresse || '—'}</p>
                        <p><span className="text-ink font-medium">ICE : </span>{t.ice || '—'}</p>
                        <p><span className="text-ink font-medium">RIB : </span>{t.rib || '—'}</p>
                      </div>
                      {t.notes && <p className="mt-2"><span className="text-ink font-medium">Notes : </span>{t.notes}</p>}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtres.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete text-sm">Aucun contact pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
