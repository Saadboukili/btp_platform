import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const MODULE_LABELS = {
  projets: 'Projets', achats: 'Achats', sous_traitance: 'Sous-traitance', stock: 'Stock',
  budgets: 'Budgets', tresorerie: 'Tresorerie', comptabilite: 'Comptabilite', rh: 'RH',
  controle_performance: 'Controle de performance', administration: 'Administration',
};

const ROLE_LABELS = {
  direction: 'Direction', chef_projet: 'Chef de projet', conducteur_travaux: 'Conducteur de travaux',
  metreur: 'Metreur', comptable: 'Comptable', acheteur: 'Acheteur',
};

export default function Permissions() {
  const { user } = useAuth();
  const [role, setRole] = useState('chef_projet');
  const [matrice, setMatrice] = useState({});
  const [modules, setModules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  function charger() {
    api.get('/permissions').then((res) => {
      setModules(res.data.modules);
      setRoles(res.data.roles);
      const m = {};
      for (const l of res.data.lignes) {
        m[`${l.role}:${l.module}`] = { peut_voir: !!l.peut_voir, peut_creer: !!l.peut_creer, peut_valider: !!l.peut_valider };
      }
      setMatrice(m);
    });
  }

  useEffect(charger, []);

  if (user?.role !== 'admin') {
    return <div className="p-8 max-w-3xl"><p className="text-sm text-concrete">Cette page est reservee a l'administrateur.</p></div>;
  }

  function toggle(module, champ) {
    const key = `${role}:${module}`;
    setMatrice((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { peut_voir: true, peut_creer: false, peut_valider: false }), [champ]: !prev[key]?.[champ] },
    }));
  }

  async function enregistrer() {
    setSaving(true); setSuccess('');
    const lignes = [];
    for (const r of roles) {
      for (const m of modules) {
        const v = matrice[`${r}:${m}`] || { peut_voir: true, peut_creer: false, peut_valider: false };
        lignes.push({ role: r, module: m, ...v });
      }
    }
    try {
      await api.put('/permissions', { lignes });
      setSuccess('Permissions enregistrees.');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
        <p className="text-sm text-concrete mt-0.5">
          Droits de creation et de validation par role et par module. L'administrateur a toujours un acces total et n'apparait pas ici.
        </p>
      </div>

      <div className="flex gap-1 mb-5 flex-wrap">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`text-xs px-3 py-1.5 rounded-md ${role === r ? 'bg-blueprint text-white' : 'bg-concrete-light text-concrete'}`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="card bg-white border border-border rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Module</th>
              <th className="text-center font-normal px-4 py-2.5">Peut creer</th>
              <th className="text-center font-normal px-4 py-2.5">Peut valider</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const v = matrice[`${role}:${m}`] || { peut_creer: false, peut_valider: false };
              return (
                <tr key={m} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{MODULE_LABELS[m]}</td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={v.peut_creer} onChange={() => toggle(m, 'peut_creer')} className="h-4 w-4 accent-blueprint cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={v.peut_valider} onChange={() => toggle(m, 'peut_valider')} className="h-4 w-4 accent-blueprint cursor-pointer" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={enregistrer} disabled={saving} className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60">
          {saving ? 'Enregistrement...' : 'Enregistrer les permissions'}
        </button>
        {success && <p className="text-sm text-ok">{success}</p>}
      </div>

      <p className="text-xs text-concrete mt-4">
        "Voir" est toujours actif pour tous les roles connectes — seuls "creer" et "valider" sont restreints ici.
        Ces reglages s'appliquent aux actions des modules Achats, Sous-traitance, Stock, Tresorerie et Comptabilite.
      </p>
    </div>
  );
}
