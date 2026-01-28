import { Clock, Mail, Phone, UserX, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PendingAccount({ userEmail }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-success-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center animate-fade-in-scale">
          {/* Icône */}
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>

          {/* Titre */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Compte en attente de validation
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Votre compte a été créé avec succès mais nécessite une validation par un administrateur.
          </p>

          {/* Informations */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6 text-left">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{userEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>📧 Vous recevrez un email</strong> une fois que votre compte sera validé par un administrateur système.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              Vous pourrez alors vous connecter avec vos identifiants.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Retour à la connexion</span>
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Si vous avez des questions, contactez le support EDG.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          SIGE-Guinée © 2025
        </p>
      </div>
    </div>
  );
}

export default PendingAccount;
