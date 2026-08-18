import { useEffect, useState } from 'react';
import api from '../lib/api';
import Badge from '../components/Badge';

const TABS = ['Niveaux', 'Mouvements', 'Inventaires'];

export default function Stock() {
  const [tab, setTab] = useState('Niveaux');
  const [produits, setProduits] = useState([]);
  const [entrepots, setEntrepots] = useState([]);

  useEffect(() => {
    api.get('/referentiels/produits').then((res) => setProduits(res.data));
    api.get('/referentiels/entrepots').then((res) => setEntrepots(res.data));
  }, [tab]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="text-sm text-concrete mt-0.5">Niveaux par entrepot, mouvements et inventaires</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t ? 'border-safety text-ink font-medium' : 'border-transparent text-concrete hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Niveaux' && <Niveaux />}
      {tab === 'Mouvements' && <Mouvements produits={produits} entrepots={entrepots} />}
      {tab === 'Inventaires' && <Inventaires entrepots={entrepots} />}
    </div>
  );
}

function Niveaux() {
  const [niveaux, setNiveaux] = useState([]);
  useEffect(() => { api.get('/stock/niveaux').then((res) => setNiveaux(res.data)); }, []);

  return (
    <div className="card bg-white border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Produit</th><th className="text-left font-normal px-4 py-2.5">Entrepot</th><th className="text-left font-normal px-4 py-2.5">Quantite</th><th className="text-left font-normal px-4 py-2.5">Statut</th></tr></thead>
        <tbody>
          {niveaux.map((n) => (
            <tr key={n.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3 font-medium">{n.designation}</td>
              <td className="px-4 py-3">{n.entrepot_nom}</td>
              <td className="px-4 py-3">{n.quantite} {n.unite}</td>
              <td className="px-4 py-3">{n.en_alerte && <Badge label="Stock bas" tone="danger" />}</td>
            </tr>
          ))}
          {niveaux.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete">Aucun stock enregistre.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Mouvements({ produits, entrepots }) {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ produit_id: '', type: 'entree', entrepot_source_id: '', entrepot_destination_id: '', quantite: '', motif: '' });
  const [error, setError] = useState('');

  function charger() { api.get('/stock/mouvements').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function creer(e) {
    e.preventDefault(); setError('');
    try {
      await api.post('/stock/mouvements', { ...form, quantite: Number(form.quantite) || 0 });
      setForm({ produit_id: '', type: 'entree', entrepot_source_id: '', entrepot_destination_id: '', quantite: '', motif: '' });
      setShowForm(false); charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  const TYPE_LABEL = { entree: 'Entree', sortie: 'Sortie', transfert: 'Transfert', inventaire: 'Regularisation inventaire' };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
          {showForm ? 'Annuler' : '+ Nouveau mouvement / transfert'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <select required value={form.produit_id} onChange={(e) => setForm({ ...form, produit_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="">Produit...</option>
            {produits.map((p) => <option key={p.id} value={p.id}>{p.designation}</option>)}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="entree">Entree</option>
            <option value="sortie">Sortie</option>
            <option value="transfert">Transfert entre entrepots/chantiers</option>
          </select>
          <input required type="number" placeholder="Quantite" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          {(form.type === 'sortie' || form.type === 'transfert') && (
            <select required value={form.entrepot_source_id} onChange={(e) => setForm({ ...form, entrepot_source_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
              <option value="">Entrepot source...</option>
              {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          )}
          {(form.type === 'entree' || form.type === 'transfert') && (
            <select required value={form.entrepot_destination_id} onChange={(e) => setForm({ ...form, entrepot_destination_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
              <option value="">Entrepot destination...</option>
              {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          )}
          <input placeholder="Motif" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          {error && <p className="col-span-3 text-sm text-danger">{error}</p>}
          <button type="submit" className="col-span-3 bg-safety text-white text-sm py-2 rounded-md hover:opacity-90">Enregistrer</button>
        </form>
      )}
      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2.5">Date</th><th className="text-left font-normal px-4 py-2.5">Produit</th><th className="text-left font-normal px-4 py-2.5">Type</th><th className="text-left font-normal px-4 py-2.5">De → Vers</th><th className="text-left font-normal px-4 py-2.5">Quantite</th></tr></thead>
          <tbody>
            {liste.map((m) => (
              <tr key={m.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 text-concrete">{String(m.date_mouvement).slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium">{m.designation}</td>
                <td className="px-4 py-3">{TYPE_LABEL[m.type]}</td>
                <td className="px-4 py-3 text-concrete">{m.entrepot_source_nom || '—'} → {m.entrepot_destination_nom || '—'}</td>
                <td className="px-4 py-3">{m.quantite}</td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-concrete">Aucun mouvement.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Inventaires({ entrepots }) {
  const [liste, setListe] = useState([]);
  const [entrepotId, setEntrepotId] = useState('');
  const [detail, setDetail] = useState(null);

  function charger() { api.get('/stock/inventaires').then((res) => setListe(res.data)); }
  useEffect(charger, []);

  async function ouvrir() {
    if (!entrepotId) return;
    try {
      const res = await api.post('/stock/inventaires', { entrepot_id: entrepotId });
      setDetail(res.data);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function voirDetail(id) {
    const res = await api.get(`/stock/inventaires/${id}`);
    setDetail(res.data);
  }

  async function saisirCompte(ligneId, valeur) {
    await api.put(`/stock/inventaires/lignes/${ligneId}`, { quantite_comptee: Number(valeur) });
    const res = await api.get(`/stock/inventaires/${detail.id}`);
    setDetail(res.data);
  }

  async function cloturer() {
    if (!confirm('Cloturer cet inventaire ? Les ecarts seront appliques au stock reel.')) return;
    try {
      await api.put(`/stock/inventaires/${detail.id}/cloturer`);
      const res = await api.get(`/stock/inventaires/${detail.id}`);
      setDetail(res.data);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select value={entrepotId} onChange={(e) => setEntrepotId(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm">
          <option value="">Choisir un entrepot...</option>
          {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
        <button onClick={ouvrir} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">+ Ouvrir un inventaire</button>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-4">
        <div className="card bg-white border border-border rounded-lg overflow-hidden self-start">
          {liste.map((i) => (
            <button key={i.id} onClick={() => voirDetail(i.id)} className={`w-full text-left px-4 py-3 text-sm border-b border-black/5 last:border-0 hover:bg-concrete-light/60 ${detail?.id === i.id ? 'bg-concrete-light' : ''}`}>
              <p className="font-medium">{i.reference}</p>
              <p className="text-xs text-concrete">{i.entrepot_nom}</p>
              <Badge label={i.statut === 'en_cours' ? 'En cours' : 'Cloture'} tone={i.statut === 'en_cours' ? 'warn' : 'ok'} />
            </button>
          ))}
          {liste.length === 0 && <p className="px-4 py-6 text-sm text-concrete">Aucun inventaire.</p>}
        </div>

        <div>
          {!detail && <p className="text-sm text-concrete">Selectionne ou cree un inventaire.</p>}
          {detail && (
            <div className="card bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-medium">{detail.reference}</p>
                {detail.statut === 'en_cours' && <button onClick={cloturer} className="text-xs text-blueprint hover:underline">Cloturer l'inventaire</button>}
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal py-2">Produit</th><th className="text-left font-normal py-2">Theorique</th><th className="text-left font-normal py-2">Compte</th><th className="text-left font-normal py-2">Ecart</th></tr></thead>
                <tbody>
                  {detail.lignes.map((l) => (
                    <tr key={l.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2">{l.designation}</td>
                      <td className="py-2">{l.quantite_theorique} {l.unite}</td>
                      <td className="py-2">
                        {detail.statut === 'en_cours' ? (
                          <input
                            type="number"
                            defaultValue={l.quantite_comptee ?? ''}
                            onBlur={(e) => e.target.value !== '' && saisirCompte(l.id, e.target.value)}
                            className="border border-border rounded-md px-2 py-1 text-sm w-24"
                          />
                        ) : (l.quantite_comptee ?? '—')}
                      </td>
                      <td className={`py-2 ${l.quantite_comptee !== null && l.quantite_comptee - l.quantite_theorique !== 0 ? 'text-danger font-medium' : 'text-concrete'}`}>
                        {l.quantite_comptee !== null ? (l.quantite_comptee - l.quantite_theorique) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
