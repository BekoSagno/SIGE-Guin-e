import { useState, useEffect } from 'react';
import { personnelService } from '@common/services';
import { UserPlus, Mail, Phone, Calendar, Shield, RefreshCw, AlertCircle } from 'lucide-react';

function NewUsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadNewUsers();
  }, [days]);

  const loadNewUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await personnelService.getNewUsers({ limit: 50, days });
      setUsers(data.users || []);
    } catch (err) {
      console.error('Erreur chargement nouveaux utilisateurs:', err);
      setError('Erreur lors du chargement des nouveaux utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête avec filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <UserPlus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Nouveaux Utilisateurs
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Citoyens récemment inscrits
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={1}>Dernières 24h</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
          </select>
          <button
            onClick={loadNewUsers}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun nouvel utilisateur dans cette période</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`p-4 bg-white dark:bg-gray-800 rounded-lg border ${
                user.isNew
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.nom}
                    </h3>
                    {user.isNew && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                        Nouveau
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    {user.sigeId && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <span className="font-mono font-medium text-primary-700 dark:text-primary-300">
                          {user.sigeId}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    
                    {user.telephone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{user.telephone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(user.createdAt)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        ({getTimeAgo(user.createdAt)})
                      </span>
                    </div>
                    
                    {user.homesCount > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {user.homesCount} foyer{user.homesCount > 1 ? 's' : ''} enregistré{user.homesCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {users.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
          {users.length} utilisateur{users.length > 1 ? 's' : ''} trouvé{users.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default NewUsersSection;
