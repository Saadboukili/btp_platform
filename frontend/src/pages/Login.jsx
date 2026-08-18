import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@btp.ma');
  const [motDePasse, setMotDePasse] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, motDePasse);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-concrete-light px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-safety flex items-center justify-center text-white text-base font-bold mb-3">
            C
          </div>
          <p className="text-xl font-semibold tracking-tight text-ink">Chantier</p>
          <p className="text-sm text-concrete mt-1">Gestion de projets de genie civil</p>
        </div>
        <form onSubmit={handleSubmit} className="card bg-white border border-border rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/30 focus:border-blueprint/50 transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-concrete mb-1">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueprint/30 focus:border-blueprint/50 transition-shadow"
              required
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blueprint text-white rounded-md py-2.5 text-sm font-medium hover:bg-blueprint-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="text-xs text-concrete text-center mt-4">
          Compte demo : admin@btp.ma / admin123
        </p>
      </div>
    </div>
  );
}
