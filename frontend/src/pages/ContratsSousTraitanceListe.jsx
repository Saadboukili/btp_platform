import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatMontant, STATUT_CONTRAT } from '../lib/format';
import Badge from '../components/Badge';

export default function ContratsSousTraitanceListe() {
  const [contrats, setContrats] = useState([]);

  useEffect(() => {
    api.get('/contrats-sous-traitance').then((res) => setContrats(res.data));
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Contrats de sous-traitance</h1>
        <p className="text-sm text-concrete mt-0.5">{contrats.length} contrat(s), tous chantiers confondus</p>
      </div>

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Reference</th>
              <th className="text-left font-normal px-4 py-2.5">Chantier</th>
              <th className="text-left font-normal px-4 py-2.5">Sous-traitant</th>
              <th className="text-left font-normal px-4 py-2.5">Nature des travaux</th>
              <th className="text-left font-normal px-4 py-2.5">Montant</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {contrats.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{c.reference}</td>
                <td className="px-4 py-3">{c.projet_nom}</td>
                <td className="px-4 py-3">{c.sous_traitant_nom}</td>
                <td className="px-4 py-3 text-concrete">{c.nature_travaux || '—'}</td>
                <td className="px-4 py-3">{formatMontant(c.montant_total)}</td>
                <td className="px-4 py-3"><Badge {...(STATUT_CONTRAT[c.statut] || { label: c.statut, tone: 'warn' })} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/projets/${c.projet_id}`} className="text-blueprint hover:underline text-xs">Voir le chantier →</Link>
                </td>
              </tr>
            ))}
            {contrats.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-concrete text-sm">Aucun contrat de sous-traitance.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
