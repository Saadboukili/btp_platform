import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatMontant } from '../lib/format';

export default function BilanChantier() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/bilan-chantier').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="p-8 text-sm text-concrete">Chargement...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bilan de chantier</h1>
        <p className="text-sm text-concrete mt-0.5">Compte de resultat previsionnel et reel, chantier par chantier</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Revenu reel (tous chantiers)</p>
          <p className="text-lg font-semibold">{formatMontant(data.total_revenu_reel)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Cout reel</p>
          <p className="text-lg font-semibold">{formatMontant(data.total_cout_reel)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Marge reelle</p>
          <p className={`text-lg font-semibold ${data.total_marge_reelle < 0 ? 'text-danger' : 'text-ok'}`}>{formatMontant(data.total_marge_reelle)}</p>
        </div>
        <div className="card bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-concrete mb-1.5">Marge prevue</p>
          <p className="text-lg font-semibold">{formatMontant(data.total_marge_prevue)}</p>
        </div>
      </div>

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5" rowSpan={2}>Chantier</th>
              <th className="text-center font-normal px-4 py-1 border-b border-black/5" colSpan={3}>Previsionnel</th>
              <th className="text-center font-normal px-4 py-1 border-b border-black/5" colSpan={3}>Reel</th>
              <th className="px-4 py-2.5" rowSpan={2}></th>
            </tr>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-1.5">Revenu</th>
              <th className="text-left font-normal px-4 py-1.5">Cout</th>
              <th className="text-left font-normal px-4 py-1.5">Marge</th>
              <th className="text-left font-normal px-4 py-1.5">Revenu</th>
              <th className="text-left font-normal px-4 py-1.5">Cout</th>
              <th className="text-left font-normal px-4 py-1.5">Marge</th>
            </tr>
          </thead>
          <tbody>
            {data.chantiers.map((b) => (
              <tr key={b.projet_id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{b.projet_nom}</td>
                <td className="px-4 py-3 text-concrete">{formatMontant(b.previsionnel.revenu)}</td>
                <td className="px-4 py-3 text-concrete">{formatMontant(b.previsionnel.cout)}</td>
                <td className={`px-4 py-3 ${b.previsionnel.marge < 0 ? 'text-danger' : ''}`}>
                  {formatMontant(b.previsionnel.marge)}
                  {b.previsionnel.taux_marge !== null && <span className="text-xs text-concrete ml-1">({b.previsionnel.taux_marge}%)</span>}
                </td>
                <td className="px-4 py-3">{formatMontant(b.reel.revenu)}</td>
                <td className="px-4 py-3">{formatMontant(b.reel.cout)}</td>
                <td className={`px-4 py-3 font-medium ${b.reel.marge < 0 ? 'text-danger' : 'text-ok'}`}>
                  {formatMontant(b.reel.marge)}
                  {b.reel.taux_marge !== null && <span className="text-xs text-concrete ml-1">({b.reel.taux_marge}%)</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/projets/${b.projet_id}`} className="text-blueprint hover:underline text-xs">Detail →</Link>
                </td>
              </tr>
            ))}
            {data.chantiers.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-concrete text-sm">Aucun chantier.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
