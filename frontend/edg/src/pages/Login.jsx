import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authService } from '@common/services';
import { Building2, Eye, EyeOff, Zap, Shield, Activity, UserPlus, ArrowRight, Clock } from 'lucide-react';

function Login() {
  const [identifier, setIdentifier] = useState(''); // Email ou ID SIGE
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Afficher le message de succès si l'utilisateur vient de s'inscrire
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Nettoyer le state après 10 secondes
      setTimeout(() => {
        setSuccessMessage('');
        navigate(location.pathname, { replace: true, state: {} });
      }, 10000);
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(identifier, password);
      const user = authService.getStoredUser();
      
      if (user?.role !== 'AGENT_EDG') {
        authService.logout();
        setError('Accès réservé aux agents EDG');
        return;
      }
      
      // Vérifier si le compte est en attente
      if (response?.data?.status === 'PENDING' || user?.status === 'PENDING') {
        setError('Compte en attente de validation. Un administrateur doit valider votre compte avant que vous puissiez vous connecter.');
        authService.logout();
        return;
      }
      
      navigate('/');
    } catch (err) {
      // Vérifier si c'est une erreur de compte en attente
      if (err.response?.data?.status === 'PENDING' || err.response?.data?.error?.includes('attente')) {
        setError('Votre compte est en attente de validation par un administrateur. Vous recevrez un email une fois votre compte activé.');
      } else {
        setError(err.response?.data?.error || 'Erreur de connexion. Vérifiez vos identifiants.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Effets de fond */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Grille décorative */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div className="relative w-full max-w-md">
        {/* Carte de connexion */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-xl mb-6 transform hover:scale-105 transition-transform">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
              SIGE-Guinée
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
              Centre de Contrôle EDG
            </p>
          </div>

          {/* Fonctionnalités */}
          <div className="flex justify-center space-x-6 mb-8">
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Activity className="w-5 h-5 text-primary-500" />
              <span className="text-xs font-medium">Monitoring</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Shield className="w-5 h-5 text-primary-500" />
              <span className="text-xs font-medium">Fraude</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Zap className="w-5 h-5 text-primary-500" />
              <span className="text-xs font-medium">Délestage</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm animate-shake">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                ID SIGE ou Email
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono"
                placeholder="GUI-DIX-00001 ou agent@edg.gn"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Utilisez votre ID SIGE (ex: GUI-DIX-00001) ou votre email
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connexion...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          {/* Lien vers register */}
          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Pas encore de compte ? S'inscrire</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Info de test */}
          <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
            <p className="text-center text-sm text-primary-700 dark:text-primary-300 font-medium">
              Compte de test
            </p>
            <p className="text-center text-xs text-primary-600 dark:text-primary-400 mt-1">
              agent@edg.gn / password123
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 text-sm mt-6">
          © 2024 SIGE-Guinée • Électricité de Guinée
        </p>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default Login;
