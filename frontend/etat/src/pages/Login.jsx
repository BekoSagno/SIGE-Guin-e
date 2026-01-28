import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@common/services';
import { Shield } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('admin@energie.gn');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Test de connexion API au montage du composant
  useEffect(() => {
    console.log('🔵 Composant Login monté');
    console.log('🔵 API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
    
    // Test rapide de l'API
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => console.log('✅ Backend accessible:', data))
      .catch(err => console.error('❌ Backend inaccessible:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔵 handleSubmit appelé');
    console.log('Email:', email);
    console.log('Password:', password ? '***' : 'vide');
    
    setError('');
    setLoading(true);

    try {
      // Validation basique
      if (!email || !password) {
        setError('Veuillez remplir tous les champs');
        setLoading(false);
        return;
      }

      console.log('📡 Tentative de connexion avec:', email);
      const result = await authService.login(email, password);
      console.log('✅ Résultat de connexion:', result);
      
      // Vérifier si l'utilisateur a le bon rôle
      if (result.user && result.user.role !== 'ADMIN_ETAT') {
        setError('Accès refusé. Ce compte n\'est pas autorisé pour le dashboard Ministère.');
        authService.logout();
        setLoading(false);
        return;
      }
      
      console.log('✅ Connexion réussie, redirection...');
      navigate('/');
    } catch (err) {
      console.error('❌ Erreur de connexion complète:', err);
      console.error('❌ Erreur response:', err.response);
      console.error('❌ Erreur request:', err.request);
      console.error('❌ Erreur message:', err.message);
      
      let errorMessage = 'Erreur de connexion';
      
      if (err.response) {
        // Le serveur a répondu avec un code d'erreur
        errorMessage = err.response.data?.error || err.response.data?.message || `Erreur ${err.response.status}`;
        console.error('❌ Erreur serveur:', err.response.data);
      } else if (err.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:5000';
        console.error('❌ Pas de réponse du serveur');
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        errorMessage = err.message || 'Erreur lors de la configuration de la requête';
        console.error('❌ Erreur de configuration:', err.message);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 flex items-center justify-center p-4">
      {/* Arrière-plan avec motifs décoratifs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Cercles décoratifs animés */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-success-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Motif géométrique subtil */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
      </div>

      {/* Carte de connexion - Appliquant la règle d'or (proportion 1:1.618) */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10 transform transition-all duration-500 hover:shadow-3xl">
          {/* En-tête avec icône */}
          <div className="text-center mb-10 animate-slide-up">
            {/* Icône avec effet de brillance */}
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Shield className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
              SIGE-Guinée
            </h1>
            <p className="text-gray-600 font-medium text-lg">Ministère de l'État</p>
            <div className="mt-3 h-1 w-24 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full mx-auto"></div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Message d'erreur avec animation */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-xl shadow-md animate-fade-in flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Champ Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <span>Email</span>
                  <span className="text-primary-600">*</span>
                </span>
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="relative w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 placeholder-gray-400 text-gray-900 font-medium hover:border-primary-300 hover:bg-white"
                  placeholder="admin@energie.gn"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <span>Mot de passe</span>
                  <span className="text-primary-600">*</span>
                </span>
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="relative w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 placeholder-gray-400 text-gray-900 font-medium hover:border-primary-300 hover:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Bouton de connexion avec effet premium */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="relative w-full group overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-primary-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
            >
              {/* Effet de brillance animé */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Contenu du bouton */}
              <span className="relative flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Se connecter</span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Informations de test */}
          <div className="mt-8 pt-6 border-t border-gray-200 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-gradient-to-r from-primary-50 to-success-50 rounded-xl p-4 border border-primary-100">
              <p className="text-sm text-center text-gray-700 font-medium">
                <span className="text-primary-600 font-semibold">Compte de test :</span>
                <br className="sm:hidden" />
                <span className="text-gray-900"> admin@energie.gn</span>
                <span className="text-gray-500 mx-2">/</span>
                <span className="text-gray-900">password123</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer avec crédits */}
        <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-white/80 text-sm font-medium">
            Système Intelligent de Gestion de l'Énergie
          </p>
          <p className="text-white/60 text-xs mt-1">
            © 2024 Ministère de l'État - République de Guinée
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
