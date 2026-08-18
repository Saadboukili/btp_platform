import { useEffect, useState } from 'react';
import { Archive, Download, RefreshCw } from 'lucide-react';
import api from '../lib/api';

function formatTaille(octets) {
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(nom) {
  // nom = ISO horodate avec ':' et '.' remplaces par '-', ex: 2026-08-16T21-13-45-918Z
  const iso = nom.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d+Z)$/, '$1:$2:$3.$4');
  const d = new Date(iso);
  if (isNaN(d)) return nom;
  return d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Sauvegardes() {
  const [liste, setListe] = useState([]);
  const [creating, setCreating] = useState(false);

  function charger() {
    api.get('/plateforme/sauvegardes').then((res) => setListe(res.data));
  }

  useEffect(charger, []);

  async function creerMaintenant() {
    setCreating(true);
    try {
      await api.post('/plateforme/sauvegardes');
      charger();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setCreating(false);
    }
  }

  async function telecharger(nom) {
    const res = await api.get(`/plateforme/sauvegardes/${nom}/telecharger`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde-${nom}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sauvegardes</h1>
          <p className="text-sm text-concrete mt-0.5">Une sauvegarde automatique de toutes les entreprises est effectuee chaque jour. 14 sauvegardes sont conservees.</p>
        </div>
        <button onClick={creerMaintenant} disabled={creating} className="bg-blueprint text-white text-sm px-4 py-2 rounded-lg hover:bg-blueprint-light shadow-sm shadow-blueprint/20 disabled:opacity-60 flex items-center gap-2">
          <RefreshCw size={14} className={creating ? 'animate-spin' : ''} />
          {creating ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}
        </button>
      </div>

      <div className="card bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-wider text-concrete/80 border-b border-border">
              <th className="text-left font-normal px-4 py-2.5">Date</th>
              <th className="text-left font-normal px-4 py-2.5">Entreprises incluses</th>
              <th className="text-left font-normal px-4 py-2.5">Taille</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((s) => (
              <tr key={s.nom} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <Archive size={14} className="text-concrete" />
                  {formatDate(s.nom)}
                </td>
                <td className="px-4 py-3">{s.nb_entreprises}</td>
                <td className="px-4 py-3 text-concrete">{formatTaille(s.taille_octets)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => telecharger(s.nom)} className="text-blueprint hover:underline text-xs inline-flex items-center gap-1">
                    <Download size={12} /> Telecharger
                  </button>
                </td>
              </tr>
            ))}
            {liste.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-concrete text-sm">Aucune sauvegarde pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-concrete mt-4">
        Les fichiers sont stockes sur ce serveur dans <code className="bg-concrete-light px-1.5 py-0.5 rounded">backend/data/backups/</code>.
        Pour une securite complete, pense a copier regulierement ce dossier (ou les zips telecharges) vers un stockage externe
        (disque externe, cloud) — une sauvegarde qui reste sur la meme machine ne protege pas contre une panne materielle.
      </p>
    </div>
  );
}
