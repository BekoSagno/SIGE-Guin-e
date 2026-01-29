import { useState, useEffect } from 'react';
import { broadcastService, notificationService } from '@common/services';
import { MessageSquare, Info, AlertTriangle, CheckCircle, XCircle, RefreshCw, Bell, Calendar } from 'lucide-react';

function EDGMessages() {
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, info, warning

  useEffect(() => {
    loadData();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer les messages broadcast reçus par l'utilisateur
      const [receivedData, notificationsData] = await Promise.all([
        broadcastService.getReceivedMessages({ limit: 50 }).catch((err) => {
          console.error('Erreur getReceivedMessages:', err);
          return { messages: [] };
        }),
        notificationService.getNotifications(false, 30).catch(() => ({ notifications: [] })),
      ]);

      // Filtrer les notifications de type broadcast
      const broadcastNotifications = (notificationsData.notifications || []).filter(
        n => n.type === 'BROADCAST' || n.type === 'MESSAGE'
      );

      // Combiner messages reçus et notifications
      let allMessages = [
        ...(receivedData.messages || []),
        ...broadcastNotifications.map(n => ({
          id: n.id,
          title: n.title,
          content: n.message,
          messageType: n.data?.messageType || 'info',
          createdAt: n.createdAt,
          read: n.read,
          isNotification: true,
        })),
      ];

      // Filtrer selon le filtre sélectionné
      if (filter === 'unread') {
        allMessages = allMessages.filter(m => !m.read);
      } else if (filter === 'info') {
        allMessages = allMessages.filter(m => m.messageType === 'info' || m.messageType === 'success');
      } else if (filter === 'warning') {
        allMessages = allMessages.filter(m => m.messageType === 'warning' || m.messageType === 'danger');
      }

      // Trier par date (plus récents en premier)
      allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setMessages(allMessages);
      setNotifications(notificationsData.notifications || []);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
      setError('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId, isNotification = false) => {
    try {
      if (isNotification) {
        await notificationService.markAsRead(messageId);
      }
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      ));
    } catch (err) {
      console.error('Erreur marquage message:', err);
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'danger':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10';
      case 'warning':
        return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'danger':
        return 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10';
      default:
        return 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10';
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
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return formatDate(dateString);
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Messages EDG
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Annonces et communications de l'EDG
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Tous</option>
            <option value="unread">Non lus</option>
            <option value="info">Informations</option>
            <option value="warning">Alertes</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Liste des messages */}
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
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun message pour le moment</p>
          <p className="text-xs mt-1">Vous recevrez ici les annonces de l'EDG</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 border rounded-lg ${getMessageColor(message.messageType)} ${
                !message.read ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''
              } hover:shadow-md transition-all cursor-pointer`}
              onClick={() => !message.read && handleMarkAsRead(message.id, message.isNotification)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getMessageIcon(message.messageType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {message.title || 'Message EDG'}
                        </h3>
                        {!message.read && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {message.content || message.message || 'Aucun contenu'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                    <span className="text-gray-400 dark:text-gray-600">
                      {getTimeAgo(message.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {messages.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
          {messages.length} message{messages.length > 1 ? 's' : ''} affiché{messages.length > 1 ? 's' : ''}
          {unreadCount > 0 && (
            <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
              ({unreadCount} non lu{unreadCount > 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default EDGMessages;
