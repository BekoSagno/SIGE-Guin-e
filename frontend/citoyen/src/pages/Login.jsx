import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@common/services';
import { Zap, QrCode } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

function Login() {
  const [identifier, setIdentifier] = useState(''); // Email ou ID SIGE
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Normaliser l'identifier avant l'envoi
      // Si c'est un email, le mettre en minuscules
      // Si c'est un ID SIGE, le mettre en majuscules
      let normalizedIdentifier = identifier.trim();
      if (normalizedIdentifier.includes('@')) {
        // C'est un email, mettre en minuscules
        normalizedIdentifier = normalizedIdentifier.toLowerCase();
      } else if (normalizedIdentifier.match(/^GUI-[A-Z]{3}-\d{5}$/i)) {
        // C'est un ID SIGE, mettre en majuscules
        normalizedIdentifier = normalizedIdentifier.toUpperCase();
      }

      console.log('🔵 Tentative de connexion avec:', normalizedIdentifier);
      
      const response = await authService.login(normalizedIdentifier, password);
      
      console.log('✅ Réponse de connexion:', response);
      
      // Extraire l'email depuis la réponse si disponible
      const userEmail = response?.user?.email || (normalizedIdentifier.includes('@') ? normalizedIdentifier : null);
      
      // Si la réponse indique qu'un OTP est requis, rediriger vers la page OTP
      if (response.requiresOTP) {
        navigate('/otp', { 
          state: { 
            email: userEmail || normalizedIdentifier,
            sigeId: response?.sigeId || response?.user?.sigeId || (normalizedIdentifier.match(/^GUI-[A-Z]{3}-\d{5}$/i) ? normalizedIdentifier : null)
          } 
        });
      } else {
        // Sinon, connexion directe (pour rétrocompatibilité)
        navigate('/');
      }
    } catch (err) {
      console.error('❌ Erreur de connexion:', err);
      console.error('❌ Erreur response:', err.response?.data);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Erreur de connexion';
      setError(errorMessage);
      
      // Si c'est une erreur réseau, donner plus de détails
      if (!err.response) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:5000');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-800 dark:to-primary-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md transition-colors">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
            <Zap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SIGE-Guinée</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Espace Citoyen</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg shadow-md animate-fade-in">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
              {error.includes('incorrect') && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                  💡 Vérifiez que vous utilisez le bon format : email en minuscules (ex: mamadou@test.com) ou ID SIGE en majuscules (ex: GUI-DIX-00001)
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID SIGE ou Email
            </label>
            <div className="relative">
              <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => {
                  const value = e.target.value;
                  // Ne mettre en majuscules que si c'est un ID SIGE (commence par GUI-)
                  // Sinon, garder la casse originale pour les emails
                  if (value.match(/^GUI-[A-Z]{0,3}/i)) {
                    setIdentifier(value.toUpperCase());
                  } else {
                    setIdentifier(value);
                  }
                }}
                required
                className="w-full px-4 pl-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                placeholder="GUI-DIX-00001 ou votre@email.com"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Utilisez votre ID SIGE (ex: GUI-DIX-00001) ou votre email
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Vérification...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Vous n'avez pas de compte ?{' '}
            <Link
              to="/register"
              className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              S'inscrire
            </Link>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Compte de test: mamadou@test.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
