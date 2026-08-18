import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { formatMontant, STATUT_PROJET } from '../lib/format';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  {
    label: 'Projet',
    letter: 'P',
    color: 'bg-blueprint',
    description: 'Appels d\'offre et suivi des chantiers',
    links: [
      { to: '/appels-offre', label: 'Appels d\'offre' },
      { to: '/projets', label: 'Projets en cours' },
    ],
  },
  {
    label: 'Achat',
    letter: 'A',
    color: 'bg-safety',
    description: 'Fournisseurs, demandes et sous-traitance',
    links: [
      { to: '/tiers', label: 'Fournisseurs' },
      { to: '/demandes-achat', label: 'Demandes d\'achat' },
      { to: '/consultations-sous-traitance', label: 'Consultations' },
      { to: '/adjudications-sous-traitance', label: 'Adjudications' },
      { to: '/contrats-sous-traitance', label: 'Contrats de sous-traitance' },
    ],
  },
  {
    label: 'Controle de performance',
    letter: 'C',
    color: 'bg-ok',
    description: 'Suivi budgetaire et rentabilite des chantiers',
    links: [
      { to: '/bilan-chantier', label: 'Bilan de chantier' },
      { to: '/controle-budgetaire', label: 'Controle budgetaire' },
    ],
  },
  {
    label: 'Stock',
    letter: 'S',
    color: 'bg-warn',
    description: 'Niveaux, mouvements et referentiels',
    links: [
      { to: '/stock', label: 'Stock' },
      { to: '/referentiels', label: 'Referentiels' },
      { to: '/importations', label: 'Importations' },
    ],
  },
  {
    label: 'Finance',
    letter: 'F',
    color: 'bg-blueprint',
    description: 'Tresorerie et comptabilite generale',
    links: [
      { to: '/tresorerie', label: 'Tresorerie' },
      { to: '/paiements', label: 'Paiements' },
      { to: '/comptabilite', label: 'Comptabilite' },
      { to: '/controle-budgetaire', label: 'Controle budgetaire' },
    ],
  },
  {
    label: 'RH',
    letter: 'R',
    color: 'bg-warn',
    description: 'Personnel et pointage',
    links: [
      { to: '/main-oeuvre', label: 'Main d\'oeuvre' },
    ],
  },
];

function MenuRapide() {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium mb-3">Acces rapide</p>
      <div className="grid grid-cols-3 gap-3">
        {SECTIONS.map((s) => (
          <div key={s.label} className="card bg-white border border-border rounded-xl p-4 hover:border-blueprint/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className={`h-7 w-7 rounded-md ${s.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                {s.letter}
              </div>
              <p className="text-sm font-medium">{s.label}</p>
            </div>
            <p className="text-xs text-concrete mb-3">{s.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-xs px-2.5 py-1 rounded-md bg-concrete-light text-ink hover:bg-blueprint hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Impossible de charger le tableau de bord'));
  }, []);

  if (error) return <div className="p-8 text-danger text-sm">{error}</div>;
  if (!data) return <div className="p-8 text-sm text-concrete">Chargement...</div>;

  const cards = [
    { label: 'Projets actifs', value: data.projets_actifs, icon: Building2, color: 'text-blueprint', bg: 'bg-blueprint/10' },
    { label: 'Budget engage', value: formatMontant(data.budget_engage), icon: Wallet, color: 'text-ink', bg: 'bg-concrete-light' },
    { label: 'Depenses reelles', value: formatMontant(data.depenses_reelles), icon: TrendingDown, color: 'text-warn', bg: 'bg-warn-light' },
    { label: 'Marge moyenne', value: `${data.marge_moyenne}%`, icon: TrendingUp, accent: data.marge_moyenne >= 0, color: data.marge_moyenne >= 0 ? 'text-ok' : 'text-danger', bg: data.marge_moyenne >= 0 ? 'bg-ok-light' : 'bg-danger-light' },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-concrete mt-0.5">Vue d'ensemble de tous les chantiers</p>
        </div>
        {user?.role === 'admin' ? (
          <Link
            to="/projets"
            className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 transition-colors"
          >
            + Nouveau projet
          </Link>
        ) : (
          <Link
            to="/projets"
            className="text-blueprint text-sm hover:underline"
          >
            Voir les projets →
          </Link>
        )}
      </div>

      <MenuRapide />

      <div className="grid grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card bg-white border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-concrete">{c.label}</p>
              <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon size={16} strokeWidth={2} className={c.color} />
              </div>
            </div>
            <p className={`text-[26px] font-bold tracking-tight ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card bg-white border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium">Projets en cours</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Projet</th>
              <th className="text-left font-normal px-4 py-2.5">Budget</th>
              <th className="text-left font-normal px-4 py-2.5">Engage</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.projets.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 hover:bg-concrete-light/50">
                <td className="px-4 py-3 font-medium">{p.nom}</td>
                <td className="px-4 py-3">{formatMontant(p.budget_prevu)}</td>
                <td className="px-4 py-3">{formatMontant(p.total_engage)}</td>
                <td className="px-4 py-3">
                  <Badge {...(STATUT_PROJET[p.statut] || { label: p.statut, tone: 'warn' })} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/projets/${p.id}`} className="text-blueprint hover:underline text-sm">
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
