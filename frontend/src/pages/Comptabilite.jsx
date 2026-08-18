import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const TABS = ['Ecritures', 'Rapports', 'Parametrage'];

export default function Comptabilite() {
  const { user } = useAuth();
  const peutGerer = user?.role === 'admin' || user?.role === 'comptable';
  const [tab, setTab] = useState('Ecritures');
  const [journaux, setJournaux] = useState([]);
  const [exercices, setExercices] = useState([]);
  const [comptes, setComptes] = useState([]);

  function chargerReferentiels() {
    api.get('/comptabilite/journaux').then((res) => setJournaux(res.data));
    api.get('/comptabilite/exercices').then((res) => setExercices(res.data));
    api.get('/comptabilite/plan-comptable').then((res) => setComptes(res.data));
  }

  useEffect(chargerReferentiels, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Comptabilite</h1>
        <p className="text-sm text-concrete mt-0.5">Plan comptable, journaux, exercices, ecritures et rapports</p>
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

      {tab === 'Ecritures' && <Ecritures journaux={journaux} exercices={exercices} comptes={comptes} peutGerer={peutGerer} />}
      {tab === 'Rapports' && <Rapports exercices={exercices} comptes={comptes} />}
      {tab === 'Parametrage' && <Parametrage journaux={journaux} exercices={exercices} comptes={comptes} onUpdate={chargerReferentiels} peutGerer={peutGerer} />}
    </div>
  );
}

function Parametrage({ journaux, exercices, comptes, onUpdate, peutGerer }) {
  const [compteForm, setCompteForm] = useState({ numero: '', intitule: '', classe: '6' });
  const [journalForm, setJournalForm] = useState({ code: '', nom: '', type: 'operations_diverses' });
  const [exerciceForm, setExerciceForm] = useState({ annee: '', date_debut: '', date_fin: '' });
  const [error, setError] = useState('');

  async function creerCompte(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/comptabilite/plan-comptable', { ...compteForm, classe: Number(compteForm.classe) });
      setCompteForm({ numero: '', intitule: '', classe: '6' });
      onUpdate();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function creerJournal(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/comptabilite/journaux', journalForm);
      setJournalForm({ code: '', nom: '', type: 'operations_diverses' });
      onUpdate();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function creerExercice(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/comptabilite/exercices', { ...exerciceForm, annee: Number(exerciceForm.annee) });
      setExerciceForm({ annee: '', date_debut: '', date_fin: '' });
      onUpdate();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function cloturer(id) {
    if (!confirm('Cloturer cet exercice ? Cette action est irreversible.')) return;
    try { await api.put(`/comptabilite/exercices/${id}/cloturer`); onUpdate(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <p className="text-sm font-medium mb-2">Exercices comptables</p>
        {peutGerer && (
          <form onSubmit={creerExercice} className="flex gap-2 mb-3">
            <input required type="number" placeholder="Annee" value={exerciceForm.annee} onChange={(e) => setExerciceForm({ ...exerciceForm, annee: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm w-28" />
            <input required type="date" value={exerciceForm.date_debut} onChange={(e) => setExerciceForm({ ...exerciceForm, date_debut: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
            <input required type="date" value={exerciceForm.date_fin} onChange={(e) => setExerciceForm({ ...exerciceForm, date_fin: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
            <button type="submit" className="bg-blueprint text-white text-sm px-3 py-1.5 rounded-md hover:bg-blueprint-light">Creer</button>
          </form>
        )}
        <div className="card bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {exercices.map((ex) => (
                <tr key={ex.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2">{ex.annee}</td>
                  <td className="px-4 py-2 text-concrete">{ex.date_debut} → {ex.date_fin}</td>
                  <td className="px-4 py-2"><Badge label={ex.statut === 'ouvert' ? 'Ouvert' : 'Cloture'} tone={ex.statut === 'ouvert' ? 'ok' : 'warn'} /></td>
                  <td className="px-4 py-2 text-right">
                    {ex.statut === 'ouvert' && peutGerer && <button onClick={() => cloturer(ex.id)} className="text-xs text-danger hover:underline">Cloturer</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Journaux</p>
        {peutGerer && (
          <form onSubmit={creerJournal} className="flex gap-2 mb-3">
            <input required placeholder="Code" value={journalForm.code} onChange={(e) => setJournalForm({ ...journalForm, code: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm w-24" />
            <input required placeholder="Nom" value={journalForm.nom} onChange={(e) => setJournalForm({ ...journalForm, nom: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm flex-1" />
            <select value={journalForm.type} onChange={(e) => setJournalForm({ ...journalForm, type: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
              <option value="achats">Achats</option>
              <option value="ventes">Ventes</option>
              <option value="banque">Banque</option>
              <option value="caisse">Caisse</option>
              <option value="operations_diverses">Operations diverses</option>
            </select>
            <button type="submit" className="bg-blueprint text-white text-sm px-3 py-1.5 rounded-md hover:bg-blueprint-light">Creer</button>
          </form>
        )}
        <div className="card bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {journaux.map((j) => (
                <tr key={j.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-medium">{j.code}</td>
                  <td className="px-4 py-2">{j.nom}</td>
                  <td className="px-4 py-2 text-concrete">{j.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Plan comptable</p>
        {peutGerer && (
          <form onSubmit={creerCompte} className="flex gap-2 mb-3">
            <input required placeholder="Numero" value={compteForm.numero} onChange={(e) => setCompteForm({ ...compteForm, numero: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm w-28" />
            <input required placeholder="Intitule" value={compteForm.intitule} onChange={(e) => setCompteForm({ ...compteForm, intitule: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm flex-1" />
            <select value={compteForm.classe} onChange={(e) => setCompteForm({ ...compteForm, classe: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
              <option value="1">Classe 1 - Financement permanent</option>
              <option value="2">Classe 2 - Actif immobilise</option>
              <option value="3">Classe 3 - Actif circulant</option>
              <option value="4">Classe 4 - Passif circulant</option>
              <option value="5">Classe 5 - Tresorerie</option>
              <option value="6">Classe 6 - Charges</option>
              <option value="7">Classe 7 - Produits</option>
            </select>
            <button type="submit" className="bg-blueprint text-white text-sm px-3 py-1.5 rounded-md hover:bg-blueprint-light">Creer</button>
          </form>
        )}
        <div className="card bg-white border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-medium">{c.numero}</td>
                  <td className="px-4 py-2">{c.intitule}</td>
                  <td className="px-4 py-2 text-concrete">Classe {c.classe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Ecritures({ journaux, exercices, comptes, peutGerer }) {
  const [liste, setListe] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ journal_id: '', exercice_id: '', date_ecriture: '', libelle: '' });
  const [lignes, setLignes] = useState([{ compte_id: '', libelle: '', debit: '', credit: '' }, { compte_id: '', libelle: '', debit: '', credit: '' }]);
  const [error, setError] = useState('');

  function charger() {
    api.get('/ecritures').then((res) => setListe(res.data));
  }

  useEffect(charger, []);

  const totalDebit = lignes.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (Number(l.credit) || 0), 0);

  async function creer(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/ecritures', {
        ...form,
        lignes: lignes.filter((l) => l.compte_id).map((l) => ({ ...l, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      });
      setForm({ journal_id: '', exercice_id: '', date_ecriture: '', libelle: '' });
      setLignes([{ compte_id: '', libelle: '', debit: '', credit: '' }, { compte_id: '', libelle: '', debit: '', credit: '' }]);
      setShowForm(false);
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function valider(id) {
    try { await api.put(`/ecritures/${id}/valider`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div>
      {peutGerer && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-blueprint text-white px-3 py-1.5 rounded-md hover:bg-blueprint-light">
            {showForm ? 'Annuler' : '+ Nouvelle ecriture'}
          </button>
        </div>
      )}

      {showForm && peutGerer && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <select required value={form.journal_id} onChange={(e) => setForm({ ...form, journal_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
              <option value="">Journal...</option>
              {journaux.map((j) => <option key={j.id} value={j.id}>{j.code} - {j.nom}</option>)}
            </select>
            <select required value={form.exercice_id} onChange={(e) => setForm({ ...form, exercice_id: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm">
              <option value="">Exercice...</option>
              {exercices.filter((ex) => ex.statut === 'ouvert').map((ex) => <option key={ex.id} value={ex.id}>{ex.annee}</option>)}
            </select>
            <input required type="date" value={form.date_ecriture} onChange={(e) => setForm({ ...form, date_ecriture: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
            <input required placeholder="Libelle" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} className="border border-border rounded-md px-3 py-1.5 text-sm" />
          </div>

          <div className="space-y-2">
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_110px_110px] gap-2">
                <select value={l.compte_id} onChange={(e) => setLignes((p) => p.map((x, idx) => idx === i ? { ...x, compte_id: e.target.value } : x))} className="border border-border rounded-md px-2 py-1.5 text-sm">
                  <option value="">Compte...</option>
                  {comptes.map((c) => <option key={c.id} value={c.id}>{c.numero} - {c.intitule}</option>)}
                </select>
                <input placeholder="Libelle ligne" value={l.libelle} onChange={(e) => setLignes((p) => p.map((x, idx) => idx === i ? { ...x, libelle: e.target.value } : x))} className="border border-border rounded-md px-2 py-1.5 text-sm" />
                <input type="number" placeholder="Debit" value={l.debit} onChange={(e) => setLignes((p) => p.map((x, idx) => idx === i ? { ...x, debit: e.target.value, credit: '' } : x))} className="border border-border rounded-md px-2 py-1.5 text-sm" />
                <input type="number" placeholder="Credit" value={l.credit} onChange={(e) => setLignes((p) => p.map((x, idx) => idx === i ? { ...x, credit: e.target.value, debit: '' } : x))} className="border border-border rounded-md px-2 py-1.5 text-sm" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLignes((p) => [...p, { compte_id: '', libelle: '', debit: '', credit: '' }])} className="text-xs text-blueprint hover:underline">
            + Ajouter une ligne
          </button>

          <div className={`text-xs ${totalDebit === totalCredit ? 'text-ok' : 'text-danger'}`}>
            Total debit: {formatMontant(totalDebit)} · Total credit: {formatMontant(totalCredit)} {totalDebit === totalCredit ? '(equilibre)' : '(desequilibre)'}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90">Enregistrer en brouillon</button>
        </form>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Piece</th>
              <th className="text-left font-normal px-4 py-2.5">Date</th>
              <th className="text-left font-normal px-4 py-2.5">Libelle</th>
              <th className="text-left font-normal px-4 py-2.5">Debit</th>
              <th className="text-left font-normal px-4 py-2.5">Credit</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((e) => (
              <tr key={e.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{e.numero_piece}</td>
                <td className="px-4 py-3 text-concrete">{e.date_ecriture}</td>
                <td className="px-4 py-3">{e.libelle}</td>
                <td className="px-4 py-3">{formatMontant(e.total_debit)}</td>
                <td className="px-4 py-3">{formatMontant(e.total_credit)}</td>
                <td className="px-4 py-3"><Badge label={e.statut === 'validee' ? 'Validee' : 'Brouillon'} tone={e.statut === 'validee' ? 'ok' : 'warn'} /></td>
                <td className="px-4 py-3 text-right">
                  {e.statut === 'brouillon' && peutGerer && <button onClick={() => valider(e.id)} className="text-blueprint hover:underline text-xs">Valider</button>}
                </td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-concrete">Aucune ecriture.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Rapports({ exercices, comptes }) {
  const [exerciceId, setExerciceId] = useState('');
  const [sousTab, setSousTab] = useState('balance');
  const [balance, setBalance] = useState(null);
  const [cpc, setCpc] = useState(null);
  const [tva, setTva] = useState(null);
  const [compteId, setCompteId] = useState('');
  const [grandLivre, setGrandLivre] = useState(null);

  useEffect(() => {
    if (exercices.length > 0 && !exerciceId) setExerciceId(exercices[0].id);
  }, [exercices]);

  const [bilan, setBilan] = useState(null);
  const [balanceAgeeClient, setBalanceAgeeClient] = useState(null);

  useEffect(() => {
    if (!exerciceId) return;
    api.get(`/rapports-comptables/balance?exercice_id=${exerciceId}`).then((res) => setBalance(res.data));
    api.get(`/rapports-comptables/cpc?exercice_id=${exerciceId}`).then((res) => setCpc(res.data));
    api.get(`/rapports-comptables/tva?exercice_id=${exerciceId}`).then((res) => setTva(res.data));
    api.get(`/rapports-comptables/bilan?exercice_id=${exerciceId}`).then((res) => setBilan(res.data));
  }, [exerciceId]);

  useEffect(() => {
    api.get('/rapports-comptables/balance-agee?type=client').then((res) => setBalanceAgeeClient(res.data));
  }, []);

  useEffect(() => {
    if (compteId && exerciceId) api.get(`/rapports-comptables/grand-livre/${compteId}?exercice_id=${exerciceId}`).then((res) => setGrandLivre(res.data));
  }, [compteId, exerciceId]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm">
          {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.annee}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {['balance', 'grand-livre', 'cpc', 'bilan', 'tva', 'balance-agee'].map((s) => (
            <button key={s} onClick={() => setSousTab(s)} className={`text-xs px-3 py-1.5 rounded-md ${sousTab === s ? 'bg-blueprint text-white' : 'bg-concrete-light text-concrete'}`}>
              {s === 'balance' ? 'Balance' : s === 'grand-livre' ? 'Grand livre' : s === 'cpc' ? 'CPC' : s === 'bilan' ? 'Bilan' : s === 'tva' ? 'Etat TVA' : 'Balance agee'}
            </button>
          ))}
        </div>
      </div>

      {sousTab === 'balance' && balance && (
        <div className="card bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2">Compte</th><th className="text-left font-normal px-4 py-2">Debit</th><th className="text-left font-normal px-4 py-2">Credit</th><th className="text-left font-normal px-4 py-2">Solde debiteur</th><th className="text-left font-normal px-4 py-2">Solde crediteur</th></tr></thead>
            <tbody>
              {balance.lignes.map((l) => (
                <tr key={l.numero} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2">{l.numero} - {l.intitule}</td>
                  <td className="px-4 py-2">{formatMontant(l.total_debit)}</td>
                  <td className="px-4 py-2">{formatMontant(l.total_credit)}</td>
                  <td className="px-4 py-2">{l.solde_debiteur > 0 ? formatMontant(l.solde_debiteur) : '—'}</td>
                  <td className="px-4 py-2">{l.solde_crediteur > 0 ? formatMontant(l.solde_crediteur) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{formatMontant(balance.total_debit)}</td>
                <td className="px-4 py-2">{formatMontant(balance.total_credit)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {sousTab === 'grand-livre' && (
        <div>
          <select value={compteId} onChange={(e) => setCompteId(e.target.value)} className="border border-border rounded-md px-3 py-2 text-sm mb-3">
            <option value="">Selectionner un compte...</option>
            {comptes.map((c) => <option key={c.id} value={c.id}>{c.numero} - {c.intitule}</option>)}
          </select>
          {grandLivre && (
            <div className="card bg-white border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2">Date</th><th className="text-left font-normal px-4 py-2">Piece</th><th className="text-left font-normal px-4 py-2">Libelle</th><th className="text-left font-normal px-4 py-2">Debit</th><th className="text-left font-normal px-4 py-2">Credit</th><th className="text-left font-normal px-4 py-2">Solde</th></tr></thead>
                <tbody>
                  {grandLivre.mouvements.map((m) => (
                    <tr key={m.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2 text-concrete">{m.date_ecriture}</td>
                      <td className="px-4 py-2">{m.numero_piece}</td>
                      <td className="px-4 py-2">{m.ecriture_libelle}</td>
                      <td className="px-4 py-2">{m.debit > 0 ? formatMontant(m.debit) : ''}</td>
                      <td className="px-4 py-2">{m.credit > 0 ? formatMontant(m.credit) : ''}</td>
                      <td className="px-4 py-2 font-medium">{formatMontant(m.solde_cumule)}</td>
                    </tr>
                  ))}
                  {grandLivre.mouvements.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-concrete">Aucun mouvement.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {sousTab === 'cpc' && cpc && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-white border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border text-sm font-medium">Charges</div>
            <table className="w-full text-sm">
              <tbody>
                {cpc.charges.map((c) => (
                  <tr key={c.numero} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-2">{c.numero} - {c.intitule}</td>
                    <td className="px-4 py-2 text-right">{formatMontant(c.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-border font-medium"><td className="px-4 py-2">Total charges</td><td className="px-4 py-2 text-right">{formatMontant(cpc.total_charges)}</td></tr></tfoot>
            </table>
          </div>
          <div className="card bg-white border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border text-sm font-medium">Produits</div>
            <table className="w-full text-sm">
              <tbody>
                {cpc.produits.map((p) => (
                  <tr key={p.numero} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-2">{p.numero} - {p.intitule}</td>
                    <td className="px-4 py-2 text-right">{formatMontant(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-border font-medium"><td className="px-4 py-2">Total produits</td><td className="px-4 py-2 text-right">{formatMontant(cpc.total_produits)}</td></tr></tfoot>
            </table>
          </div>
          <div className="col-span-2 card bg-white border border-border rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm font-medium">Resultat net</p>
            <p className={`text-lg font-semibold ${cpc.resultat_net < 0 ? 'text-danger' : 'text-ok'}`}>{formatMontant(cpc.resultat_net)}</p>
          </div>
        </div>
      )}

      {sousTab === 'tva' && tva && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1.5">TVA recuperable</p>
            <p className="text-lg font-semibold">{formatMontant(tva.tva_recuperable)}</p>
          </div>
          <div className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1.5">TVA facturee</p>
            <p className="text-lg font-semibold">{formatMontant(tva.tva_facturee)}</p>
          </div>
          <div className="card bg-white border border-border rounded-lg p-4">
            <p className="text-xs text-concrete mb-1.5">{tva.tva_a_payer > 0 ? 'TVA a payer' : 'Credit de TVA'}</p>
            <p className="text-lg font-semibold">{formatMontant(tva.tva_a_payer > 0 ? tva.tva_a_payer : tva.credit_tva)}</p>
          </div>
        </div>
      )}

      {sousTab === 'bilan' && bilan && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="card bg-white border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border text-sm font-medium">Actif</div>
              <table className="w-full text-sm">
                <tbody>
                  {bilan.actif.map((l) => (
                    <tr key={l.classe} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2">{l.label}</td>
                      <td className="px-4 py-2 text-right">{formatMontant(l.montant)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-border font-medium"><td className="px-4 py-2">Total actif</td><td className="px-4 py-2 text-right">{formatMontant(bilan.total_actif)}</td></tr></tfoot>
              </table>
            </div>
            <div className="card bg-white border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border text-sm font-medium">Passif</div>
              <table className="w-full text-sm">
                <tbody>
                  {bilan.passif.map((l) => (
                    <tr key={l.classe} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2">{l.label}</td>
                      <td className="px-4 py-2 text-right">{formatMontant(l.montant)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-black/5">
                    <td className="px-4 py-2">Resultat de l'exercice</td>
                    <td className={`px-4 py-2 text-right ${bilan.resultat_net < 0 ? 'text-danger' : 'text-ok'}`}>{formatMontant(bilan.resultat_net)}</td>
                  </tr>
                </tbody>
                <tfoot><tr className="border-t border-border font-medium"><td className="px-4 py-2">Total passif</td><td className="px-4 py-2 text-right">{formatMontant(bilan.total_passif)}</td></tr></tfoot>
              </table>
            </div>
          </div>
          <p className={`text-xs ${bilan.equilibre ? 'text-ok' : 'text-danger'}`}>
            {bilan.equilibre ? '✓ Bilan equilibre (actif = passif)' : '⚠ Bilan non equilibre — verifier les ecritures'}
          </p>
        </div>
      )}

      {sousTab === 'balance-agee' && balanceAgeeClient && (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {Object.entries(balanceAgeeClient.tranches).map(([tranche, montant]) => (
              <div key={tranche} className="card bg-white border border-border rounded-lg p-4">
                <p className="text-xs text-concrete mb-1.5">{tranche} jours</p>
                <p className={`text-lg font-semibold ${tranche === '90+' ? 'text-danger' : ''}`}>{formatMontant(montant)}</p>
              </div>
            ))}
          </div>
          <div className="card bg-white border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border"><th className="text-left font-normal px-4 py-2">Facture</th><th className="text-left font-normal px-4 py-2">Client</th><th className="text-left font-normal px-4 py-2">Anciennete</th><th className="text-left font-normal px-4 py-2">Solde</th></tr></thead>
              <tbody>
                {balanceAgeeClient.lignes.map((l) => (
                  <tr key={l.reference} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-2">{l.reference}</td>
                    <td className="px-4 py-2">{l.tiers_nom}</td>
                    <td className="px-4 py-2 text-concrete">{l.jours_anciennete} jours</td>
                    <td className="px-4 py-2 font-medium">{formatMontant(l.solde)}</td>
                  </tr>
                ))}
                {balanceAgeeClient.lignes.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-concrete">Aucune creance ouverte.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
