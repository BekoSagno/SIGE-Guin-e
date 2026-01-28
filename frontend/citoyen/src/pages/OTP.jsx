import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '@common/services';
import { Shield, RefreshCw, ArrowLeft, QrCode, Copy, CheckCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

function OTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [sigeId, setSigeId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);

  useEffect(() => {
    // Récupérer l'email et l'ID SIGE depuis la location state
    const emailFromState = location.state?.email;
    const sigeIdFromState = location.state?.sigeId;
    
    if (emailFromState) {
      setEmail(emailFromState);
    } else {
      // Si pas d'email dans l'état, rediriger vers login
      navigate('/login');
    }
    
    if (sigeIdFromState) {
      setSigeId(sigeIdFromState);
    }
  }, [location, navigate]);

  const handleCopySigeId = () => {
    if (sigeId) {
      navigator.clipboard.writeText(sigeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Countdown pour le renvoi du code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    // Ne permettre que les chiffres
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Passer au champ suivant si une valeur est saisie
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Supprimer et retourner au champ précédent
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      setError('');
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Veuillez saisir les 6 chiffres du code');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.verifyOTP(email, otpCode);
      
      // Vérifier que le token est bien stocké avant de rediriger
      if (response.token && response.user) {
        // Le token est déjà stocké dans authService.verifyOTP
        // Utiliser window.location pour forcer un rechargement et que App.jsx détecte le token
        window.location.href = '/';
      } else {
        throw new Error('Token non reçu après vérification OTP');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                           err.response?.data?.errors?.[0]?.msg || 
                           'Code de vérification incorrect';
      setError(errorMessage);
      // Réinitialiser les champs en cas d'erreur
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    setError('');

    try {
      await authService.resendOTP(email);
      setCountdown(60); // Relancer le countdown
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erreur lors de l\'envoi du code';
      setError(errorMessage);
    } finally {
      setResending(false);
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
            <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Vérification</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Entrez le code envoyé à <br />
            <span className="font-semibold text-primary-600 dark:text-primary-400">{email}</span>
          </p>
        </div>

        {/* Affichage de l'ID SIGE si disponible */}
        {sigeId && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl border-2 border-primary-300 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <QrCode className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div>
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase mb-1">
                    Votre ID SIGE
                  </p>
                  <span className="font-mono text-lg font-bold text-primary-800 dark:text-primary-200">
                    {sigeId}
                  </span>
                </div>
              </div>
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
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
              Utilisez cet ID pour vous connecter après vérification
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Vous n'avez pas reçu le code ?
            </p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending || countdown > 0}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 dark:hover:text-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending 
                ? 'Envoi...' 
                : countdown > 0 
                  ? `Renvoyer (${countdown}s)` 
                  : 'Renvoyer le code'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OTP;
