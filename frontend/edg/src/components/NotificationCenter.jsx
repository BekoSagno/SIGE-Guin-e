import { useState, useEffect } from 'react';
import { notificationService } from '@common/services';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, Filter, X } from 'lucide-react';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, NEW_USER, INCIDENT_REPORTED, etc.

  useEffect(() => {
    loadNotifications();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter, typeFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await notificationService.getNotifications(false, 100);
      let filtered = data.notifications || [];

      // Filtrer par statut de lecture
      if (filter === 'unread') {
        filtered = filtered.filter(n => !n.read);
      } else if (filter === 'read') {
        filtered = filtered.filter(n => n.read);
      }

      // Filtrer par type
      if (typeFilter !== 'all') {
        filtered = filtered.filter(n => n.type === typeFilter);
      }

      // Trier par date (plus récents en premier)
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(filtered);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
      setError('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Erreur marquage notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Erreur marquage toutes notifications:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_USER':
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'INCIDENT_REPORTED':
        return <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'FRAUDE_SUSPECTEE':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'HIGH') {
      return 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10';
    }
    if (priority === 'NORMAL') {
      return 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10';
    }
    return 'border-gray-200 dark:border-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return formatDate(dateString);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationTypes = [...new Set(notifications.map(n => n.type))];

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Centre de Notifications
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Toutes vos notifications système
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Tout marquer comme lu
            </button>
          )}
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Toutes</option>
          <option value="unread">Non lues ({unreadCount})</option>
          <option value="read">Lues</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Tous les types</option>
          {notificationTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Liste des notifications */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg ${getNotificationColor(notification.type, notification.priority)} ${
                !notification.read ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''
              } hover:shadow-md transition-all cursor-pointer`}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                        )}
                        {notification.priority === 'HIGH' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      {notification.data && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          {JSON.stringify(notification.data, null, 2)}
                        </div>
                      )}
                    </div>
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Marquer comme lu"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 mt-2">
                    <span>{formatDate(notification.createdAt)}</span>
                    <span className="text-gray-400 dark:text-gray-600">
                      ({getTimeAgo(notification.createdAt)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {notifications.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
          {notifications.length} notification{notifications.length > 1 ? 's' : ''} affichée{notifications.length > 1 ? 's' : ''}
          {unreadCount > 0 && (
            <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
              ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
