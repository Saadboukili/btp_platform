import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const VIDE_LIGNE = { designation: '', unite: 'u', quantite: '' };

const STATUT_DEMANDE = {
  brouillon: { label: 'Brouillon', tone: 'warn' },
  en_attente: { label: 'En attente (chef de projet)', tone: 'warn' },
  validee: { label: 'Validee - a generer', tone: 'warn' },
  rejetee: { label: 'Rejetee', tone: 'danger' },
  bon_commande_genere: { label: 'BC genere', tone: 'ok' },
};

export default function DemandesAchat() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [projets, setProjets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projet_id: '', commentaire: '' });
  const [lignes, setLignes] = useState([{ ...VIDE_LIGNE }]);
  const [error, setError] = useState('');
  const [bcGenere, setBcGenere] = useState(null);

  const peutValider = user?.role === 'admin' || user?.role === 'chef_projet';
  const peutGenererBC = user?.role === 'admin' || user?.role === 'acheteur';

  function charger() {
    api.get('/demandes-achat').then((res) => setDemandes(res.data));
  }

  useEffect(() => {
    charger();
    api.get('/projets').then((res) => setProjets(res.data));
  }, []);

  function updateLigne(i, field, value) {
    setLignes((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  async function handleCreate(e, soumettre) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/demandes-achat', {
        ...form,
        soumettre,
        lignes: lignes.filter((l) => l.designation).map((l) => ({ ...l, quantite: Number(l.quantite) || 0 })),
      });
      setForm({ projet_id: '', commentaire: '' });
      setLignes([{ ...VIDE_LIGNE }]);
      setShowForm(false);
      charger();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la creation');
    }
  }

  async function soumettre(id) {
    try { await api.put(`/demandes-achat/${id}/soumettre`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function valider(id) {
    try { await api.put(`/demandes-achat/${id}/valider`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function rejeter(id) {
    try { await api.put(`/demandes-achat/${id}/rejeter`); charger(); }
    catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  async function genererBC(id) {
    try {
      const res = await api.put(`/demandes-achat/${id}/generer-bc`);
      setBcGenere(res.data.bon_commande);
      charger();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demandes d'achat</h1>
          <p className="text-sm text-concrete mt-0.5">
            Circuit : demandeur → validation chef de projet → generation BC par l'acheteur → signature direction
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouvelle demande'}
        </button>
      </div>

      {bcGenere && (
        <div className="bg-ok-light border border-ok/20 rounded-lg p-4 my-4 text-sm flex items-center justify-between">
          <div>
            <p className="font-medium text-ok">Bon de commande genere : {bcGenere.reference}</p>
            <p className="text-concrete mt-0.5">Fournisseur et prix a completer, puis a faire signer par la direction.</p>
          </div>
          <Link to={`/projets/${bcGenere.projet_id}`} className="text-blueprint hover:underline text-sm shrink-0 ml-4">
            Ouvrir le projet →
          </Link>
        </div>
      )}

      {showForm && (
        <form className="card bg-white border border-border rounded-lg p-5 my-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-concrete mb-1">Projet</label>
              <select
                required
                value={form.projet_id}
                onChange={(e) => setForm({ ...form, projet_id: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selectionner...</option>
                {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-concrete mb-1">Commentaire</label>
              <input
                value={form.commentaire}
                onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-concrete mb-2">Lignes de la demande</p>
            <div className="space-y-2">
              {lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px] gap-2">
                  <input
                    placeholder="Designation"
                    value={l.designation}
                    onChange={(e) => updateLigne(i, 'designation', e.target.value)}
                    className="border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Unite"
                    value={l.unite}
                    onChange={(e) => updateLigne(i, 'unite', e.target.value)}
                    className="border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qte"
                    value={l.quantite}
                    onChange={(e) => updateLigne(i, 'quantite', e.target.value)}
                    className="border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLignes((prev) => [...prev, { ...VIDE_LIGNE }])}
              className="text-xs text-blueprint hover:underline mt-2"
            >
              + Ajouter une ligne
            </button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={(e) => handleCreate(e, false)} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-concrete-light">
              Enregistrer en brouillon
            </button>
            <button onClick={(e) => handleCreate(e, true)} className="text-sm px-4 py-2 rounded-md bg-blueprint text-white hover:bg-blueprint-light">
              Soumettre pour validation
            </button>
          </div>
        </form>
      )}

      <div className="card bg-white border border-border rounded-lg overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Reference</th>
              <th className="text-left font-normal px-4 py-2.5">Projet</th>
              <th className="text-left font-normal px-4 py-2.5">Demandeur</th>
              <th className="text-left font-normal px-4 py-2.5">Valide par</th>
              <th className="text-left font-normal px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => (
              <tr key={d.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{d.reference}</td>
                <td className="px-4 py-3">{d.projet_nom || '—'}</td>
                <td className="px-4 py-3 text-concrete">{d.demandeur_nom || '—'}</td>
                <td className="px-4 py-3 text-concrete">{d.valide_par_nom || '—'}</td>
                <td className="px-4 py-3"><Badge {...(STATUT_DEMANDE[d.statut] || { label: d.statut, tone: 'warn' })} /></td>
                <td className="px-4 py-3 text-right space-x-2">
                  {d.statut === 'brouillon' && (
                    <button onClick={() => soumettre(d.id)} className="text-blueprint hover:underline text-xs">Soumettre</button>
                  )}
                  {d.statut === 'en_attente' && peutValider && (
                    <>
                      <button onClick={() => valider(d.id)} className="text-ok hover:underline text-xs">Valider</button>
                      <button onClick={() => rejeter(d.id)} className="text-danger hover:underline text-xs">Rejeter</button>
                    </>
                  )}
                  {d.statut === 'validee' && peutGenererBC && (
                    <button onClick={() => genererBC(d.id)} className="text-ok hover:underline text-xs">Generer le BC</button>
                  )}
                </td>
              </tr>
            ))}
            {demandes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-concrete text-sm">Aucune demande d'achat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
