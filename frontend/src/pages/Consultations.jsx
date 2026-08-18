import { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatMontant, STATUT_CONSULTATION, STATUT_PARTICIPANT } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

export default function Consultations() {
  const { user } = useAuth();
  const peutGerer = ['admin', 'chef_projet', 'conducteur_travaux'].includes(user?.role);
  const peutCloturer = user?.role === 'admin' || user?.role === 'chef_projet';
  const [liste, setListe] = useState([]);
  const [projets, setProjets] = useState([]);
  const [sousTraitants, setSousTraitants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projet_id: '', nature_travaux: '', description: '', date_limite_reponse: '' });
  const [selectedST, setSelectedST] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  function charger() {
    api.get('/consultations-sous-traitance').then((res) => setListe(res.data));
  }

  useEffect(() => {
    charger();
    api.get('/projets').then((res) => setProjets(res.data));
    api.get('/tiers?type=sous_traitant').then((res) => setSousTraitants(res.data));
  }, []);

  useEffect(() => {
    if (selected) api.get(`/consultations-sous-traitance/${selected}`).then((res) => setDetail(res.data));
  }, [selected]);

  function rechargerDetail() {
    if (selected) api.get(`/consultations-sous-traitance/${selected}`).then((res) => setDetail(res.data));
  }

  async function creer(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/consultations-sous-traitance', { ...form, sous_traitant_ids: selectedST });
      setForm({ projet_id: '', nature_travaux: '', description: '', date_limite_reponse: '' });
      setSelectedST([]);
      setShowForm(false);
      charger();
      setSelected(res.data.id);
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function enregistrerReponse(participantId, statut) {
    if (statut === 'decline') {
      try { await api.put(`/consultations-sous-traitance/participants/${participantId}`, { statut }); rechargerDetail(); }
      catch (err) { alert(err.response?.data?.error || 'Erreur'); }
      return;
    }
    const montant = prompt('Montant propose par le sous-traitant (MAD) ?');
    if (!montant) return;
    const delai = prompt('Delai propose (jours) ?', '30');
    try {
      await api.put(`/consultations-sous-traitance/participants/${participantId}`, {
        statut: 'repondu', montant_propose: Number(montant), delai_propose_jours: Number(delai) || null,
      });
      rechargerDetail();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function cloturer() {
    try { await api.put(`/consultations-sous-traitance/${selected}/cloturer`); rechargerDetail(); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultations sous-traitants</h1>
          <p className="text-sm text-concrete mt-0.5">Invite plusieurs sous-traitants a proposer une offre avant adjudication</p>
        </div>
        {peutGerer && (
          <button onClick={() => setShowForm((v) => !v)} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20">
            {showForm ? 'Annuler' : '+ Nouvelle consultation'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={creer} className="card bg-white border border-border rounded-lg p-5 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select required value={form.projet_id} onChange={(e) => setForm({ ...form, projet_id: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm">
              <option value="">Chantier...</option>
              {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
            <input required placeholder="Nature des travaux" value={form.nature_travaux} onChange={(e) => setForm({ ...form, nature_travaux: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
            <input type="date" value={form.date_limite_reponse} onChange={(e) => setForm({ ...form, date_limite_reponse: e.target.value })} className="border border-border rounded-md px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-border rounded-md px-3 py-2 text-sm" />

          <div>
            <p className="text-xs font-medium text-concrete mb-2">Sous-traitants a consulter</p>
            <div className="flex flex-wrap gap-2">
              {sousTraitants.map((st) => (
                <label key={st.id} className={`text-xs px-3 py-1.5 rounded-md border cursor-pointer ${selectedST.includes(st.id) ? 'bg-blueprint text-white border-blueprint' : 'border-border text-concrete'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedST.includes(st.id)}
                    onChange={() => setSelectedST((prev) => prev.includes(st.id) ? prev.filter((id) => id !== st.id) : [...prev, st.id])}
                  />
                  {st.nom}
                </label>
              ))}
              {sousTraitants.length === 0 && <p className="text-xs text-concrete">Aucun sous-traitant enregistre — ajoute-les dans "Fournisseurs & sous-traitants" d'abord.</p>}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90">Creer et envoyer la consultation</button>
        </form>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="card bg-white border border-border rounded-lg overflow-hidden self-start">
          {liste.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-black/5 last:border-0 hover:bg-concrete-light/60 ${selected === c.id ? 'bg-concrete-light' : ''}`}
            >
              <p className="font-medium">{c.nature_travaux}</p>
              <p className="text-xs text-concrete mt-0.5">{c.projet_nom} · {c.nb_reponses}/{c.nb_participants} reponses</p>
              <Badge {...(STATUT_CONSULTATION[c.statut] || { label: c.statut, tone: 'warn' })} />
            </button>
          ))}
          {liste.length === 0 && <p className="px-4 py-6 text-sm text-concrete">Aucune consultation.</p>}
        </div>

        <div>
          {!detail && <p className="text-sm text-concrete">Selectionne une consultation.</p>}
          {detail && (
            <div className="card bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{detail.nature_travaux}</p>
                  <p className="text-xs text-concrete">{detail.reference} · echeance : {detail.date_limite_reponse || 'non definie'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge {...(STATUT_CONSULTATION[detail.statut] || { label: detail.statut, tone: 'warn' })} />
                  {detail.statut === 'envoyee' && peutCloturer && (
                    <button onClick={cloturer} className="text-xs text-blueprint hover:underline">Cloturer les reponses</button>
                  )}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
                    <th className="text-left font-normal py-2">Sous-traitant</th>
                    <th className="text-left font-normal py-2">Offre</th>
                    <th className="text-left font-normal py-2">Delai</th>
                    <th className="text-left font-normal py-2">Statut</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {detail.participants.map((p) => (
                    <tr key={p.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2">{p.sous_traitant_nom}</td>
                      <td className="py-2">{p.montant_propose ? formatMontant(p.montant_propose) : '—'}</td>
                      <td className="py-2">{p.delai_propose_jours ? `${p.delai_propose_jours} j` : '—'}</td>
                      <td className="py-2"><Badge {...(STATUT_PARTICIPANT[p.statut] || { label: p.statut, tone: 'warn' })} /></td>
                      <td className="py-2 text-right">
                        {p.statut === 'invite' && detail.statut === 'envoyee' && peutGerer && (
                          <div className="space-x-2">
                            <button onClick={() => enregistrerReponse(p.id, 'repondu')} className="text-ok hover:underline text-xs">Saisir offre</button>
                            <button onClick={() => enregistrerReponse(p.id, 'decline')} className="text-danger hover:underline text-xs">Decline</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {detail.statut === 'cloturee' && (
                <p className="text-xs text-concrete mt-3">Cette consultation est prete pour l'adjudication — rendez-vous dans l'onglet "Adjudications".</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
