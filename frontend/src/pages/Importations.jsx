import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant } from '../lib/format';
import Badge from '../components/Badge';

export default function Importations() {
  const [liste, setListe] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [projets, setProjets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    projet_id: '', fournisseur_id: '', devise: 'EUR', taux_change: '10.8', incoterm: 'FOB',
    montant_marchandise_devise: '', frais_transport: '', frais_douane: '', frais_assurance: '', frais_transit: '',
  });
  const [error, setError] = useState('');

  function charger() { api.get('/importations').then((res) => setListe(res.data)); }
  useEffect(() => {
    charger();
    api.get('/tiers?type=fournisseur').then((res) => setFournisseurs(res.data));
    api.get('/projets').then((res) => setProjets(res.data));
  }, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/importations', {
        ...form,
        taux_change: Number(form.taux_change) || 1,
        montant_marchandise_devise: Number(form.montant_marchandise_devise) || 0,
        frais_transport: Number(form.frais_transport) || 0,
        frais_douane: Number(form.frais_douane) || 0,
        frais_assurance: Number(form.frais_assurance) || 0,
        frais_transit: Number(form.frais_transit) || 0,
      });
      setShowForm(false);
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importations</h1>
          <p className="text-sm text-concrete mt-0.5">Achats internationaux : devise, incoterm et cout de revient</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
          {showForm ? 'Annuler' : '+ Nouvelle importation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-xl p-5 mb-6 grid grid-cols-4 gap-3">
          <select value={form.projet_id} onChange={(e) => setForm({ ...form, projet_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Chantier...</option>
            {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          <select value={form.fournisseur_id} onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Fournisseur...</option>
            {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="CNY">CNY</option>
          </select>
          <select value={form.incoterm} onChange={(e) => setForm({ ...form, incoterm: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            {['FOB', 'CIF', 'EXW', 'DDP', 'FCA'].map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <input required type="number" step="0.01" placeholder="Montant marchandise (devise)" value={form.montant_marchandise_devise} onChange={(e) => setForm({ ...form, montant_marchandise_devise: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input required type="number" step="0.0001" placeholder="Taux de change" value={form.taux_change} onChange={(e) => setForm({ ...form, taux_change: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Transport (MAD)" value={form.frais_transport} onChange={(e) => setForm({ ...form, frais_transport: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Douane (MAD)" value={form.frais_douane} onChange={(e) => setForm({ ...form, frais_douane: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Assurance (MAD)" value={form.frais_assurance} onChange={(e) => setForm({ ...form, frais_assurance: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="Transit (MAD)" value={form.frais_transit} onChange={(e) => setForm({ ...form, frais_transit: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          {error && <p className="col-span-4 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-4 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Creer</button>
        </form>
      )}

      <div className="card bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Reference</th>
              <th className="text-left font-normal px-4 py-2.5">Fournisseur</th>
              <th className="text-left font-normal px-4 py-2.5">Incoterm</th>
              <th className="text-left font-normal px-4 py-2.5">Marchandise (MAD)</th>
              <th className="text-left font-normal px-4 py-2.5">Frais</th>
              <th className="text-left font-normal px-4 py-2.5">Cout de revient</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((i) => (
              <tr key={i.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{i.reference}</td>
                <td className="px-4 py-3">{i.fournisseur_nom || '—'}</td>
                <td className="px-4 py-3 text-concrete">{i.incoterm || '—'}</td>
                <td className="px-4 py-3">{formatMontant(i.montant_marchandise_mad)}</td>
                <td className="px-4 py-3">{formatMontant(i.total_frais)}</td>
                <td className="px-4 py-3 font-medium">{formatMontant(i.cout_revient_total)}</td>
                <td className="px-4 py-3"><Badge label={i.statut === 'en_cours' ? 'En cours' : i.statut === 'receptionnee' ? 'Receptionnee' : 'Cloturee'} tone={i.statut === 'en_cours' ? 'warn' : 'ok'} /></td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-concrete">Aucune importation.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
