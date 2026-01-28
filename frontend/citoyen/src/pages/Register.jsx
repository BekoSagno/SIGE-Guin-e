import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@common/services';
import { Zap, UserPlus, QrCode, Mail, CheckCircle, Copy, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

function Register() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [edgId, setEdgId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sigeId, setSigeId] = useState(null);
  const [showSigeId, setShowSigeId] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopySigeId = () => {
    if (sigeId) {
      navigator.clipboard.writeText(sigeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.register({
        nom,
        email,
        password,
        edgId: edgId || undefined, // Envoyer undefined si vide
        role: 'CITOYEN', // S'assurer que c'est un citoyen
      });
      
      // Si un ID SIGE a été généré, l'afficher
      if (response?.data?.sigeId) {
        setSigeId(response.data.sigeId);
        setShowSigeId(true);
        setLoading(false);
        // Ne pas rediriger immédiatement, afficher l'ID SIGE
        return;
      }
      
      // Si la réponse indique qu'un OTP est requis, rediriger vers la page OTP
      if (response?.data?.requiresOTP) {
        navigate('/otp', { 
          state: { 
            email,
            sigeId: response?.data?.sigeId || null,
            message: response?.data?.hint || 'Code de vérification envoyé par email'
          } 
        });
      } else {
        // Sinon, connexion directe (pour rétrocompatibilité)
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                           err.response?.data?.errors?.[0]?.msg || 
                           'Erreur lors de l\'inscription';
      setError(errorMessage);
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
        {!showSigeId ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
                <UserPlus className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SIGE-Guinée</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Créer un compte</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom complet
            </label>
            <input
              id="nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Votre nom complet"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="votre@email.com"
            />
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
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 6 caractères
            </p>
          </div>

          <div>
            <label htmlFor="edgId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Identifiant EDG <span className="text-gray-400 dark:text-gray-500 text-xs">(optionnel)</span>
            </label>
            <input
              id="edgId"
              type="text"
              value={edgId}
              onChange={(e) => setEdgId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Votre identifiant client EDG"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Liez votre compte à votre identifiant client EDG pour accéder à vos factures
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création du compte...' : 'S\'inscrire'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vous avez déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
          </>
        ) : (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-success-100 dark:bg-success-900 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-success-600 dark:text-success-400" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Compte créé avec succès !
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Votre ID SIGE unique vous a été attribué
              </p>
            </div>

            {/* Affichage de l'ID SIGE */}
            <div className="p-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl border-2 border-primary-300 dark:border-primary-700">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <QrCode className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 uppercase">
                  Votre ID SIGE
                </p>
              </div>
              
              <div className="flex items-center justify-center space-x-3 mb-4">
                <span className="font-mono text-2xl font-bold text-primary-800 dark:text-primary-200">
                  {sigeId}
                </span>
                <button
                  onClick={handleCopySigeId}
                  className="p-2 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-lg transition-colors"
                  title="Copier l'ID SIGE"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-success-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  )}
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <strong>📧 Un email contenant votre ID SIGE a été envoyé à :</strong>
                </p>
                <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {email}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>🔐 Comment vous connecter :</strong>
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 text-left">
                <li>• Utilisez votre <strong>ID SIGE</strong> : <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{sigeId}</code></li>
                <li>• Ou utilisez votre <strong>email</strong> : <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{email}</code></li>
                <li>• Avec le mot de passe que vous avez choisi</li>
              </ul>
            </div>

            {/* Message OTP */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Vérification email requise
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Un code de vérification a été envoyé à votre email. 
                    Vous devez le valider avant de pouvoir vous connecter.
                  </p>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/otp', { state: { email, sigeId } })}
                className="w-full btn-primary py-3"
              >
                <Mail className="w-5 h-5" />
                <span>Vérifier mon email</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => {
                  setShowSigeId(false);
                  setSigeId(null);
                }}
                className="w-full btn-secondary py-2 text-sm"
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Register;
