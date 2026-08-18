import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant } from '../lib/format';

export default function Paiements() {
  const [liste, setListe] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [type, setType] = useState('client');
  const [facturesOuvertes, setFacturesOuvertes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tiers_nom: '', mode: 'virement', compte_tresorerie_id: '' });
  const [montants, setMontants] = useState({});
  const [error, setError] = useState('');

  function charger() {
    api.get('/paiements').then((res) => setListe(res.data));
  }

  useEffect(() => {
    charger();
    api.get('/tresorerie/comptes').then((res) => setComptes(res.data));
  }, []);

  useEffect(() => {
    api.get(`/paiements/factures-ouvertes?type=${type}`).then((res) => setFacturesOuvertes(res.data));
    setMontants({});
  }, [type, showForm]);

  const montantTotal = Object.values(montants).reduce((s, v) => s + (Number(v) || 0), 0);

  async function creer(e) {
    e.preventDefault();
    setError('');
    const allocations = Object.entries(montants)
      .filter(([, m]) => Number(m) > 0)
      .map(([facture_id, montant]) => ({ facture_id: Number(facture_id), montant: Number(montant) }));
    if (allocations.length === 0) { setError('Renseigne au moins un montant a allouer'); return; }

    try {
      await api.post('/paiements', { type, ...form, compte_tresorerie_id: form.compte_tresorerie_id || null, allocations });
      setForm({ tiers_nom: '', mode: 'virement', compte_tresorerie_id: '' });
      setShowForm(false);
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
          <p className="text-sm text-concrete mt-0.5">Reglement d'un tiers reparti sur une ou plusieurs factures</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
          {showForm ? 'Annuler' : '+ Nouveau paiement'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <select value={type} onChange={(e) => setType(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm">
              <option value="client">Encaissement client</option>
              <option value="fournisseur">Decaissement fournisseur/sous-traitant</option>
            </select>
            <input required placeholder="Nom du tiers" value={form.tiers_nom} onChange={(e) => setForm({ ...form, tiers_nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
              <option value="virement">Virement</option>
              <option value="cheque">Cheque</option>
              <option value="especes">Especes</option>
            </select>
            <select value={form.compte_tresorerie_id} onChange={(e) => setForm({ ...form, compte_tresorerie_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
              <option value="">Compte tresorerie (optionnel)</option>
              {comptes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-medium text-concrete mb-2">Factures ouvertes — repartis le montant du paiement</p>
            <div className="space-y-2">
              {facturesOuvertes.map((f) => (
                <div key={f.id} className="grid grid-cols-[1fr_100px_100px_120px] gap-2 items-center text-sm">
                  <span>{f.reference} — {f.tiers_nom}</span>
                  <span className="text-concrete text-xs">Solde : {formatMontant(f.solde)}</span>
                  <span></span>
                  <input
                    type="number"
                    placeholder="Montant"
                    value={montants[f.id] || ''}
                    onChange={(e) => setMontants({ ...montants, [f.id]: e.target.value })}
                    className="border border-border rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
              {facturesOuvertes.length === 0 && <p className="text-xs text-concrete">Aucune facture ouverte pour ce type.</p>}
            </div>
            <p className="text-xs text-concrete mt-2">Total alloue : {formatMontant(montantTotal)}</p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90">Enregistrer le paiement</button>
        </form>
      )}

      <div className="card bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Reference</th>
              <th className="text-left font-normal px-4 py-2.5">Type</th>
              <th className="text-left font-normal px-4 py-2.5">Tiers</th>
              <th className="text-left font-normal px-4 py-2.5">Montant</th>
              <th className="text-left font-normal px-4 py-2.5">Mode</th>
              <th className="text-left font-normal px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{p.reference}</td>
                <td className="px-4 py-3 text-concrete">{p.type === 'client' ? 'Encaissement' : 'Decaissement'}</td>
                <td className="px-4 py-3">{p.tiers_nom}</td>
                <td className="px-4 py-3">{formatMontant(p.montant_total)}</td>
                <td className="px-4 py-3 text-concrete">{p.mode || '—'}</td>
                <td className="px-4 py-3 text-concrete">{String(p.date_paiement).slice(0, 10)}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete">Aucun paiement.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
