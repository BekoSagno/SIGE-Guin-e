import { useState, useEffect } from 'react';
import { familyService } from '@common/services';
import { Users, UserPlus, X, Shield, User, Baby } from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

function FamilyManagement({ homeId, userRole }) {
  const notify = useNotification();
  const [members, setMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => {
    if (homeId) {
      loadMembers();
    }
  }, [homeId]);

  const loadMembers = async () => {
    try {
      const data = await familyService.getMembers(homeId);
      setMembers(data.members || []);
    } catch (error) {
      console.error('Erreur chargement membres:', error);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await familyService.inviteMember(homeId, email, role);
      setEmail('');
      setRole('MEMBER');
      setShowInvite(false);
      setError('');
      loadMembers();
      notify.success(`Invitation envoyée à ${email}`, {
        title: '👨‍👩‍👧‍👦 Membre invité',
        duration: 5000,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'invitation';
      setError(errorMessage);
      notify.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    const member = members.find(m => m.id === userId);
    setConfirmDialog({
      isOpen: true,
      title: 'Retirer ce membre ?',
      message: `Êtes-vous sûr de vouloir retirer ${member?.nom || 'ce membre'} du foyer ?`,
      type: 'danger',
      confirmText: 'Retirer',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await familyService.removeMember(homeId, userId);
          loadMembers();
          notify.success('Membre retiré du foyer', {
            title: '✅ Suppression effectuée',
          });
        } catch (error) {
          notify.error(error.response?.data?.error || 'Erreur lors du retrait');
        }
      },
    });
  };

  const canManage = userRole === 'ADMIN';

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4" />;
      case 'MEMBER':
        return <User className="w-4 h-4" />;
      case 'CHILD':
        return <Baby className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'MEMBER':
        return 'Membre';
      case 'CHILD':
        return 'Enfant';
      default:
        return role;
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gestion Familiale</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Invitez et gérez les membres de votre foyer</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="btn-primary whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            <span>Inviter un Membre</span>
          </button>
        )}
      </div>

      {showInvite && canManage && (
        <form onSubmit={handleInvite} className="mb-6 p-5 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border-2 border-primary-200 dark:border-primary-800 animate-slide-down">
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Inviter un nouveau membre</h4>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all"
                placeholder="exemple@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Rôle attribué
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all"
              >
                <option value="MEMBER">Membre (Adulte)</option>
                <option value="ADMIN">Administrateur</option>
                <option value="CHILD">Enfant (Accès limité)</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Invitation...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Envoyer l'invitation</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInvite(false);
                  setError('');
                  setEmail('');
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun membre invité pour l'instant</p>
          </div>
        ) : (
          members.map((member, index) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  member.role === 'ADMIN' ? 'bg-primary-100 dark:bg-primary-900/30' :
                  member.role === 'CHILD' ? 'bg-success-100 dark:bg-success-900/30' :
                  'bg-accent-100 dark:bg-accent-900/30'
                }`}>
                  <div className={`${
                    member.role === 'ADMIN' ? 'text-primary-600 dark:text-primary-400' :
                    member.role === 'CHILD' ? 'text-success-600 dark:text-success-400' :
                    'text-accent-600 dark:text-accent-400'
                  }`}>
                    {getRoleIcon(member.role)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 dark:text-gray-100">{member.nom}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      member.role === 'ADMIN' ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300' :
                      member.role === 'CHILD' ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300' :
                      'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300'
                    }`}>
                      {getRoleLabel(member.role)}
                    </span>
                    {member.isOwner && (
                      <span className="text-xs font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white px-2.5 py-1 rounded-full">
                        Propriétaire
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{member.email}</div>
                </div>
              </div>
              {canManage && !member.isOwner && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="mt-3 sm:mt-0 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
}

export default FamilyManagement;
