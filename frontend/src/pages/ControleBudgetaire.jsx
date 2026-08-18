import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatMontant } from '../lib/format';

export default function ControleBudgetaire() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/controle-budgetaire').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="p-8 text-sm text-concrete">Chargement...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Controle budgetaire</h1>
        <p className="text-sm text-concrete mt-0.5">Rapprochement du realise avec le budget previsionnel, chantier par chantier</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Budget global</p>
          <p className="text-xl font-semibold">{formatMontant(data.total_budget_global)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Engage global</p>
          <p className="text-xl font-semibold">{formatMontant(data.total_engage_global)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Chantiers en depassement</p>
          <p className={`text-xl font-semibold ${data.chantiers_en_depassement > 0 ? 'text-danger' : 'text-ok'}`}>{data.chantiers_en_depassement}</p>
        </div>
      </div>

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Chantier</th>
              <th className="text-left font-normal px-4 py-2.5">Budget</th>
              <th className="text-left font-normal px-4 py-2.5">Engage</th>
              <th className="text-left font-normal px-4 py-2.5">Ecart</th>
              <th className="text-left font-normal px-4 py-2.5">Taux d'engagement</th>
              <th className="text-left font-normal px-4 py-2.5">Postes en depassement</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.projets.map((p) => (
              <tr key={p.projet_id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{p.projet_nom}</td>
                {p.sans_budget ? (
                  <td colSpan={5} className="px-4 py-3 text-concrete text-xs">Aucun budget (chiffrage) valide pour ce chantier</td>
                ) : (
                  <>
                    <td className="px-4 py-3">{formatMontant(p.total_budget)}</td>
                    <td className="px-4 py-3">{formatMontant(p.total_engage)}</td>
                    <td className={`px-4 py-3 font-medium ${p.total_ecart < 0 ? 'text-danger' : 'text-ok'}`}>{formatMontant(p.total_ecart)}</td>
                    <td className="px-4 py-3">
                      <div className="w-20 bg-concrete-light rounded-full h-1.5 overflow-hidden inline-block align-middle mr-1.5">
                        <div className={`h-full ${p.total_ecart < 0 ? 'bg-danger' : 'bg-blueprint'}`} style={{ width: `${Math.min(100, p.taux_engagement || 0)}%` }} />
                      </div>
                      <span className="text-xs text-concrete">{p.taux_engagement ?? 0}%</span>
                    </td>
                    <td className={`px-4 py-3 ${p.postes_en_depassement > 0 ? 'text-danger font-medium' : 'text-concrete'}`}>{p.postes_en_depassement}</td>
                  </>
                )}
                <td className="px-4 py-3 text-right">
                  <Link to={`/projets/${p.projet_id}`} className="text-blueprint hover:underline text-xs">Detail →</Link>
                </td>
              </tr>
            ))}
            {data.projets.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-concrete text-sm">Aucun chantier actif.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
