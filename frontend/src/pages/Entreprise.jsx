import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Entreprise() {
  const { user } = useAuth();
  const [entreprise, setEntreprise] = useState(null);
  const [form, setForm] = useState({ nom: '', adresse: '', telephone: '', email: '', ice: '', directeur_nom: '' });
  const [fichiers, setFichiers] = useState({ logo: null, cachet: null, signature: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function charger() {
    api.get('/entreprise').then((res) => {
      setEntreprise(res.data);
      setForm({
        nom: res.data.nom || '',
        adresse: res.data.adresse || '',
        telephone: res.data.telephone || '',
        email: res.data.email || '',
        ice: res.data.ice || '',
        directeur_nom: res.data.directeur_nom || '',
      });
    });
  }

  useEffect(charger, []);

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-sm text-concrete">Cette page est reservee a l'administrateur.</p>
      </div>
    );
  }

  async function enregistrerInfos(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.put('/entreprise', form);
      setSuccess('Coordonnees enregistrees.');
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur'); }
  }

  async function envoyerFichiers(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const formData = new FormData();
    if (fichiers.logo) formData.append('logo', fichiers.logo);
    if (fichiers.cachet) formData.append('cachet', fichiers.cachet);
    if (fichiers.signature) formData.append('signature', fichiers.signature);
    if (!fichiers.logo && !fichiers.cachet && !fichiers.signature) return;

    try {
      await api.post('/entreprise/fichiers', formData);
      setFichiers({ logo: null, cachet: null, signature: null });
      setSuccess('Fichiers mis a jour.');
      charger();
    } catch (err) { setError(err.response?.data?.error || 'Erreur lors de l\'upload'); }
  }

  const apiOrigin = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Entreprise</h1>
        <p className="text-sm text-concrete mt-0.5">Coordonnees, logo, cachet et signature utilises sur les documents PDF generes (bons de commande...)</p>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      {success && <p className="text-sm text-ok mb-4">{success}</p>}

      <form onSubmit={enregistrerInfos} className="card bg-white border border-border rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-concrete mb-1">Nom de l'entreprise</label>
          <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-concrete mb-1">Adresse</label>
          <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-concrete mb-1">Telephone</label>
          <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-concrete mb-1">Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-concrete mb-1">ICE</label>
          <input value={form.ice} onChange={(e) => setForm({ ...form, ice: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-concrete mb-1">Nom du directeur (signataire)</label>
          <input value={form.directeur_nom} onChange={(e) => setForm({ ...form, directeur_nom: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="col-span-2 bg-blueprint text-white text-sm py-2 rounded-md hover:bg-blueprint-light justify-self-start px-4">
          Enregistrer les coordonnees
        </button>
      </form>

      <form onSubmit={envoyerFichiers} className="card bg-white border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium">Logo, cachet et signature</p>
        <p className="text-xs text-concrete -mt-2">PNG ou JPEG, 5 Mo max chacun. Le cachet et la signature sont inseres automatiquement sur le PDF du bon de commande une fois celui-ci valide.</p>

        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'logo', label: 'Logo', url: entreprise?.logo_url },
            { key: 'cachet', label: 'Cachet de l\'entreprise', url: entreprise?.cachet_url },
            { key: 'signature', label: 'Signature du directeur', url: entreprise?.signature_url },
          ].map(({ key, label, url }) => (
            <div key={key}>
              <p className="text-xs font-medium text-concrete mb-1.5">{label}</p>
              <div className="h-20 border border-border rounded-md bg-concrete-light flex items-center justify-center mb-2 overflow-hidden">
                {url ? (
                  <img src={`${apiOrigin}${url}`} alt={label} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[11px] text-concrete">Aucun fichier</span>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFichiers({ ...fichiers, [key]: e.target.files[0] })}
                className="text-xs w-full"
              />
            </div>
          ))}
        </div>

        <button type="submit" className="bg-safety text-white text-sm px-4 py-2 rounded-md hover:opacity-90">
          Envoyer les fichiers selectionnes
        </button>
      </form>
    </div>
  );
}
