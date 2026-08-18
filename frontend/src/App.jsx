import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjetsListe from './pages/ProjetsListe';
import ProjetDetail from './pages/ProjetDetail';
import Tiers from './pages/Tiers';
import DemandesAchat from './pages/DemandesAchat';
import AppelsOffre from './pages/AppelsOffre';
import Tresorerie from './pages/Tresorerie';
import ControleBudgetaire from './pages/ControleBudgetaire';
import BilanChantier from './pages/BilanChantier';
import MainOeuvre from './pages/MainOeuvre';
import Comptabilite from './pages/Comptabilite';
import ContratsSousTraitanceListe from './pages/ContratsSousTraitanceListe';
import Consultations from './pages/Consultations';
import Adjudications from './pages/Adjudications';
import Entreprise from './pages/Entreprise';
import Utilisateurs from './pages/Utilisateurs';
import Referentiels from './pages/Referentiels';
import Stock from './pages/Stock';
import Importations from './pages/Importations';
import BudgetsRef from './pages/BudgetsRef';
import Paiements from './pages/Paiements';
import Permissions from './pages/Permissions';
import Plateforme from './pages/Plateforme';
import Sauvegardes from './pages/Sauvegardes';
import { useAuth } from './context/AuthContext';

function Accueil() {
  const { user } = useAuth();
  if (user?.platform_admin && !user?.tenant_id) return <Plateforme />;
  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Accueil />} />
            <Route path="/plateforme" element={<Plateforme />} />
            <Route path="/sauvegardes" element={<Sauvegardes />} />
            <Route path="/projets" element={<ProjetsListe />} />
            <Route path="/projets/:id" element={<ProjetDetail />} />
            <Route path="/tiers" element={<Tiers />} />
            <Route path="/demandes-achat" element={<DemandesAchat />} />
            <Route path="/appels-offre" element={<AppelsOffre />} />
            <Route path="/tresorerie" element={<Tresorerie />} />
            <Route path="/controle-budgetaire" element={<ControleBudgetaire />} />
            <Route path="/bilan-chantier" element={<BilanChantier />} />
            <Route path="/main-oeuvre" element={<MainOeuvre />} />
            <Route path="/comptabilite" element={<Comptabilite />} />
            <Route path="/contrats-sous-traitance" element={<ContratsSousTraitanceListe />} />
            <Route path="/consultations-sous-traitance" element={<Consultations />} />
            <Route path="/adjudications-sous-traitance" element={<Adjudications />} />
            <Route path="/entreprise" element={<Entreprise />} />
            <Route path="/utilisateurs" element={<Utilisateurs />} />
            <Route path="/referentiels" element={<Referentiels />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/importations" element={<Importations />} />
            <Route path="/budgets-ref" element={<BudgetsRef />} />
            <Route path="/paiements" element={<Paiements />} />
            <Route path="/permissions" element={<Permissions />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
