import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, ShoppingCart, Boxes, Wallet, TrendingUp,
  Landmark, Users, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_TREE = [
  { type: 'link', to: '/', label: 'Tableau de bord', end: true, icon: LayoutDashboard },
  {
    type: 'group',
    label: 'Projet',
    icon: Building2,
    children: [
      { type: 'link', to: '/appels-offre', label: 'Appels d\'offre' },
      { type: 'link', to: '/projets', label: 'Projets en cours' },
    ],
  },
  {
    type: 'group',
    label: 'Achat',
    icon: ShoppingCart,
    children: [
      { type: 'link', to: '/tiers', label: 'Fournisseurs' },
      { type: 'link', to: '/demandes-achat', label: 'Demandes d\'achat' },
      { type: 'link', to: '/importations', label: 'Importations' },
      {
        type: 'group',
        label: 'Sous-traitance',
        children: [
          { type: 'link', to: '/consultations-sous-traitance', label: 'Consultations' },
          { type: 'link', to: '/adjudications-sous-traitance', label: 'Adjudications' },
          { type: 'link', to: '/contrats-sous-traitance', label: 'Contrats de sous-traitance' },
        ],
      },
    ],
  },
  {
    type: 'group',
    label: 'Stock',
    icon: Boxes,
    children: [
      { type: 'link', to: '/stock', label: 'Niveaux, mouvements, inventaires' },
      { type: 'link', to: '/referentiels', label: 'Referentiels (clients, produits...)' },
    ],
  },
  {
    type: 'group',
    label: 'Budgets',
    icon: TrendingUp,
    children: [
      { type: 'link', to: '/budgets-ref', label: 'Postes, couts, prestations' },
      { type: 'link', to: '/bilan-chantier', label: 'Bilan de chantier' },
      { type: 'link', to: '/controle-budgetaire', label: 'Controle budgetaire' },
    ],
  },
  {
    type: 'group',
    label: 'Finance',
    icon: Wallet,
    children: [
      { type: 'link', to: '/tresorerie', label: 'Tresorerie' },
      { type: 'link', to: '/paiements', label: 'Paiements' },
      { type: 'link', to: '/comptabilite', label: 'Comptabilite' },
    ],
  },
  {
    type: 'group',
    label: 'RH',
    icon: Users,
    children: [
      { type: 'link', to: '/main-oeuvre', label: 'Main d\'oeuvre' },
    ],
  },
  {
    type: 'group',
    label: 'Administration',
    icon: Settings,
    children: [
      { type: 'link', to: '/utilisateurs', label: 'Utilisateurs' },
      { type: 'link', to: '/permissions', label: 'Permissions' },
      { type: 'link', to: '/entreprise', label: 'Entreprise' },
    ],
  },
];

const ROLE_LABELS = {
  admin: 'Administrateur',
  direction: 'Direction',
  chef_projet: 'Chef de projet',
  conducteur_travaux: 'Conducteur de travaux',
  metreur: 'Metreur',
  comptable: 'Comptable',
  acheteur: 'Acheteur',
};

function containsActivePath(item, pathname) {
  if (item.type === 'link') return item.end ? pathname === item.to : pathname.startsWith(item.to);
  return item.children.some((child) => containsActivePath(child, pathname));
}

function NavNode({ item, depth, pathname }) {
  const [open, setOpen] = useState(() => containsActivePath(item, pathname));
  const Icon = item.icon;

  if (item.type === 'link') {
    return (
      <NavLink
        to={item.to}
        end={item.end}
        style={{ paddingLeft: `${14 + depth * 16}px` }}
        className={({ isActive }) =>
          `flex items-center gap-2.5 py-[8px] pr-3 text-[13.5px] rounded-lg transition-all ${
            isActive
              ? 'bg-white text-ink font-semibold shadow-sm'
              : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {Icon ? (
              <Icon size={16} strokeWidth={2} className={isActive ? 'text-safety' : 'opacity-70'} />
            ) : (
              <span className={`h-1 w-1 rounded-full shrink-0 ${isActive ? 'bg-safety' : 'bg-white/30'}`} />
            )}
            {item.label}
          </>
        )}
      </NavLink>
    );
  }

  const active = containsActivePath(item, pathname);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${14 + depth * 16}px` }}
        className={`w-full flex items-center gap-2.5 py-[8px] pr-3 text-[13px] font-medium rounded-lg transition-colors ${
          active ? 'text-white' : 'text-white/45 hover:text-white/80'
        }`}
      >
        {Icon && <Icon size={16} strokeWidth={2} className={active ? 'text-safety' : 'opacity-60'} />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight size={13} strokeWidth={2.5} className={`transition-transform duration-150 shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mt-0.5 mb-1.5">
          {item.children.map((child, i) => (
            <NavNode key={`${item.label}-${child.label}-${i}`} item={child} depth={depth + 1} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout, retourPlateforme, enVisitePlateforme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleRetourPlateforme() {
    retourPlateforme();
    navigate('/plateforme');
  }

  const initiales = (user?.nom || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Session plateforme "pure" (pas en train de visiter une entreprise) : ecran minimal,
  // sans le menu metier qui ne s'applique pas a une entreprise en particulier.
  if (user?.platform_admin && !user?.tenant_id) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="h-16 bg-ink flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-safety flex items-center justify-center text-white text-sm font-extrabold">C</div>
            <p className="text-[15px] font-bold text-white tracking-tight">Chantier <span className="text-white/40 font-normal">— Plateforme</span></p>
            <nav className="flex items-center gap-1 ml-6">
              <NavLink to="/plateforme" className={({ isActive }) => `text-sm px-3 py-1.5 rounded-md ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}>
                Entreprises
              </NavLink>
              <NavLink to="/sauvegardes" className={({ isActive }) => `text-sm px-3 py-1.5 rounded-md ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}>
                Sauvegardes
              </NavLink>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-white/50 hover:text-white text-sm flex items-center gap-1.5">
            <LogOut size={15} /> Se deconnecter
          </button>
        </header>
        <main className="flex-1 bg-concrete-light">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {enVisitePlateforme && (
        <div className="bg-safety text-white text-xs px-6 py-2 flex items-center justify-between shrink-0">
          <span>Vous consultez les donnees de <strong>{user?.tenant_nom}</strong> depuis le compte plateforme.</span>
          <button onClick={handleRetourPlateforme} className="underline hover:no-underline font-medium">← Retour a la plateforme</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      <aside className="w-72 shrink-0 bg-gradient-to-b from-ink to-[#1c2029] flex flex-col">
        <div className="px-5 h-[68px] flex items-center gap-2.5 border-b border-white/[0.08]">
          <div className="h-9 w-9 rounded-lg bg-safety flex items-center justify-center text-white text-sm font-extrabold shadow-md shadow-safety/20">
            C
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight leading-none">Chantier</p>
            <p className="text-[10.5px] text-white/40 mt-1 leading-none">Gestion de projets BTP</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_TREE.map((item, i) => (
            <NavNode key={`${item.label}-${i}`} item={item} depth={0} pathname={location.pathname} />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.08] flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blueprint-light to-blueprint text-white text-[12px] font-bold flex items-center justify-center shrink-0 shadow-sm">
            {initiales}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{user?.nom}</p>
            <p className="text-[11px] text-white/40 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Se deconnecter"
            className="text-white/40 hover:text-white transition-colors shrink-0"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
      </div>
    </div>
  );
}
