import { createContext, useContext, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('btp_user');
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, mot_de_passe) {
    const res = await api.post('/auth/login', { email, mot_de_passe });
    localStorage.setItem('btp_token', res.data.token);
    localStorage.setItem('btp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem('btp_token');
    localStorage.removeItem('btp_user');
    localStorage.removeItem('btp_platform_token');
    localStorage.removeItem('btp_platform_user');
    setUser(null);
  }

  // Le compte plateforme "entre" dans une entreprise cliente pour voir ses donnees (support).
  // On garde de cote la session plateforme d'origine pour pouvoir y revenir.
  async function entrerDansEntreprise(tenantId) {
    const res = await api.post(`/plateforme/entreprises/${tenantId}/entrer`);
    if (!localStorage.getItem('btp_platform_token')) {
      localStorage.setItem('btp_platform_token', localStorage.getItem('btp_token'));
      localStorage.setItem('btp_platform_user', localStorage.getItem('btp_user'));
    }
    localStorage.setItem('btp_token', res.data.token);
    localStorage.setItem('btp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function retourPlateforme() {
    const token = localStorage.getItem('btp_platform_token');
    const platformUser = localStorage.getItem('btp_platform_user');
    if (!token || !platformUser) return;
    localStorage.setItem('btp_token', token);
    localStorage.setItem('btp_user', platformUser);
    localStorage.removeItem('btp_platform_token');
    localStorage.removeItem('btp_platform_user');
    setUser(JSON.parse(platformUser));
  }

  const enVisitePlateforme = !!localStorage.getItem('btp_platform_token');

  return (
    <AuthContext.Provider value={{ user, login, logout, entrerDansEntreprise, retourPlateforme, enVisitePlateforme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
