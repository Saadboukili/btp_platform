import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant } from '../lib/format';
import { useAuth } from '../context/AuthContext';

export default function Tresorerie() {
  const { user } = useAuth();
  const peutGerer = user?.role === 'admin' || user?.role === 'comptable';
  const [comptes, setComptes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [solde, setSolde] = useState(null);
  const [showCompteForm, setShowCompteForm] = useState(false);
  const [compteForm, setCompteForm] = useState({ nom: '', type: 'banque', solde_initial: '' });
  const [showMvtForm, setShowMvtForm] = useState(false);
  const [mvtForm, setMvtForm] = useState({ compte_id: '', type: 'encaissement', mode: 'virement', montant: '', libelle: '' });

  function charger() {
    api.get('/tresorerie/comptes').then((res) => setComptes(res.data));
    api.get('/tresorerie/mouvements').then((res) => setMouvements(res.data));
    api.get('/tresorerie/solde-global').then((res) => setSolde(res.data));
  }

  useEffect(charger, []);

  async function handleCreateCompte(e) {
    e.preventDefault();
    try {
      await api.post('/tresorerie/comptes', { ...compteForm, solde_initial: Number(compteForm.solde_initial) || 0 });
      setCompteForm({ nom: '', type: 'banque', solde_initial: '' });
      setShowCompteForm(false);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur lors de la creation du compte'); }
  }

  async function handleCreateMvt(e) {
    e.preventDefault();
    try {
      await api.post('/tresorerie/mouvements', { ...mvtForm, montant: Number(mvtForm.montant) || 0 });
      setMvtForm({ compte_id: '', type: 'encaissement', mode: 'virement', montant: '', libelle: '' });
      setShowMvtForm(false);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement du mouvement'); }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tresorerie</h1>
          <p className="text-sm text-concrete mt-0.5">Suivi de la banque et de la caisse</p>
        </div>
        {peutGerer && (
          <div className="flex gap-2">
            <button onClick={() => setShowCompteForm((v) => !v)} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-concrete-light">
              + Compte
            </button>
            <button onClick={() => setShowMvtForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
              + Mouvement
            </button>
          </div>
        )}
      </div>

      {solde && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1.5">Solde banque</p>
            <p className="text-xl font-semibold">{formatMontant(solde.solde_banque)}</p>
          </div>
          <div className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1.5">Solde caisse</p>
            <p className="text-xl font-semibold">{formatMontant(solde.solde_caisse)}</p>
          </div>
          <div className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1.5">Solde total</p>
            <p className="text-xl font-semibold text-ok">{formatMontant(solde.solde_total)}</p>
          </div>
        </div>
      )}

      {showCompteForm && (
        <form onSubmit={handleCreateCompte} className="card bg-white border border-border rounded-lg p-5 mb-6 grid grid-cols-3 gap-3">
          <input required placeholder="Nom du compte" value={compteForm.nom} onChange={(e) => setCompteForm({ ...compteForm, nom: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <select value={compteForm.type} onChange={(e) => setCompteForm({ ...compteForm, type: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="banque">Banque</option>
            <option value="caisse">Caisse</option>
          </select>
          <input type="number" placeholder="Solde initial" value={compteForm.solde_initial} onChange={(e) => setCompteForm({ ...compteForm, solde_initial: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <button type="submit" className="col-span-3 bg-blueprint text-white text-sm py-2 rounded-md hover:bg-blueprint-light">Creer le compte</button>
        </form>
      )}

      {showMvtForm && (
        <form onSubmit={handleCreateMvt} className="card bg-white border border-border rounded-lg p-5 mb-6 grid grid-cols-3 gap-3">
          <select required value={mvtForm.compte_id} onChange={(e) => setMvtForm({ ...mvtForm, compte_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Compte...</option>
            {comptes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={mvtForm.type} onChange={(e) => setMvtForm({ ...mvtForm, type: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="encaissement">Encaissement</option>
            <option value="decaissement">Decaissement</option>
          </select>
          <select value={mvtForm.mode} onChange={(e) => setMvtForm({ ...mvtForm, mode: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
            <option value="virement">Virement</option>
            <option value="cheque">Cheque</option>
            <option value="especes">Especes</option>
          </select>
          <input required placeholder="Libelle" value={mvtForm.libelle} onChange={(e) => setMvtForm({ ...mvtForm, libelle: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm col-span-2" />
          <input required type="number" placeholder="Montant" value={mvtForm.montant} onChange={(e) => setMvtForm({ ...mvtForm, montant: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          <button type="submit" className="col-span-3 bg-blueprint text-white text-sm py-2 rounded-md hover:bg-blueprint-light">Enregistrer le mouvement</button>
        </form>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        {comptes.map((c) => (
          <div key={c.id} className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1">{c.type === 'banque' ? 'Banque' : 'Caisse'}</p>
            <p className="font-medium text-sm mb-1.5">{c.nom}</p>
            <p className="text-lg font-semibold">{formatMontant(c.solde)}</p>
          </div>
        ))}
      </div>

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Date</th>
              <th className="text-left font-normal px-4 py-2.5">Compte</th>
              <th className="text-left font-normal px-4 py-2.5">Libelle</th>
              <th className="text-left font-normal px-4 py-2.5">Type</th>
              <th className="text-left font-normal px-4 py-2.5">Montant</th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map((m) => (
              <tr key={m.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 text-concrete">{String(m.date_mouvement).slice(0, 10)}</td>
                <td className="px-4 py-3">{m.compte_nom}</td>
                <td className="px-4 py-3">{m.libelle}</td>
                <td className="px-4 py-3 text-concrete">{m.mode || '—'}</td>
                <td className={`px-4 py-3 font-medium ${m.type === 'encaissement' ? 'text-ok' : 'text-danger'}`}>
                  {m.type === 'encaissement' ? '+' : '-'}{formatMontant(m.montant)}
                </td>
              </tr>
            ))}
            {mouvements.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-concrete text-sm">Aucun mouvement.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
