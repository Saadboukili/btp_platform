import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatMontant } from '../lib/format';
import { useAuth } from '../context/AuthContext';

export default function Adjudications() {
  const { user } = useAuth();
  const peutAdjuger = ['admin', 'chef_projet', 'direction'].includes(user?.role);
  const [consultations, setConsultations] = useState([]);
  const [details, setDetails] = useState({});
  const [resultat, setResultat] = useState(null);

  function charger() {
    api.get('/consultations-sous-traitance?statut=cloturee').then(async (res) => {
      setConsultations(res.data);
      const map = {};
      for (const c of res.data) {
        const d = await api.get(`/consultations-sous-traitance/${c.id}`);
        map[c.id] = d.data;
      }
      setDetails(map);
    });
  }

  useEffect(charger, []);

  async function adjuger(consultationId, participantId, tauxRetenue) {
    if (!confirm('Confirmer l\'adjudication a ce sous-traitant ? Un contrat de sous-traitance sera cree.')) return;
    try {
      const res = await api.put(`/consultations-sous-traitance/${consultationId}/adjuger`, {
        participant_id: participantId,
        taux_retenue_garantie: Number(tauxRetenue) || 0,
      });
      setResultat(res.data.contrat);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Adjudications</h1>
        <p className="text-sm text-concrete mt-0.5">Consultations cloturees, en attente du choix du sous-traitant retenu</p>
      </div>

      {resultat && (
        <div className="bg-ok-light border border-ok/20 rounded-lg p-4 mb-5 text-sm flex items-center justify-between">
          <p className="text-ok font-medium">Contrat de sous-traitance cree : {resultat.reference} ({formatMontant(resultat.montant_total)})</p>
          <Link to={`/projets/${resultat.projet_id}`} className="text-blueprint hover:underline">Voir le chantier →</Link>
        </div>
      )}

      <div className="space-y-4">
        {consultations.map((c) => {
          const d = details[c.id];
          const reponses = d?.participants.filter((p) => p.statut === 'repondu') || [];
          return (
            <div key={c.id} className="card bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{c.nature_travaux}</p>
                  <p className="text-xs text-concrete">{c.projet_nom} · {c.reference}</p>
                </div>
              </div>

              {reponses.length === 0 ? (
                <p className="text-sm text-concrete">Aucune offre recue — aucune adjudication possible.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
                      <th className="text-left font-normal py-2">Sous-traitant</th>
                      <th className="text-left font-normal py-2">Offre</th>
                      <th className="text-left font-normal py-2">Delai</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reponses.sort((a, b) => a.montant_propose - b.montant_propose).map((p, i) => (
                      <tr key={p.id} className="border-b border-black/5 last:border-0">
                        <td className="py-2">{p.sous_traitant_nom} {i === 0 && <span className="text-ok text-xs ml-1">(moins-disant)</span>}</td>
                        <td className="py-2 font-medium">{formatMontant(p.montant_propose)}</td>
                        <td className="py-2">{p.delai_propose_jours ? `${p.delai_propose_jours} j` : '—'}</td>
                        <td className="py-2 text-right">
                          {peutAdjuger ? (
                            <button
                              onClick={() => adjuger(c.id, p.id, prompt('Taux de retenue de garantie (%) ?', '10'))}
                              className="text-blueprint hover:underline text-xs"
                            >
                              Adjuger a ce sous-traitant
                            </button>
                          ) : (
                            <span className="text-xs text-concrete">Reserve au chef de projet / direction</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {consultations.length === 0 && (
          <p className="text-sm text-concrete text-center py-8">Aucune consultation en attente d'adjudication.</p>
        )}
      </div>
    </div>
  );
}
