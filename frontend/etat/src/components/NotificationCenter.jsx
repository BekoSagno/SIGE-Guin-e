import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { notificationService } from '@common/services';
import { authService } from '@common/services';

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(false, 20);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const wsUrl = `ws://localhost:5000/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connecté pour notifications');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          // Ajouter la nouvelle notification
          setNotifications(prev => [data.notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Afficher une notification toast
          showToastNotification(data.notification);
        }
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket fermé, reconnexion dans 5s...');
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Erreur connexion WebSocket:', error);
    }
  };

  const showToastNotification = (notification) => {
    // Créer un élément toast temporaire
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-l-4 border-primary-500 animate-fade-in-scale max-w-sm';
    toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          ${getNotificationIcon(notification.type)}
        </div>
        <div class="flex-1">
          <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm">${notification.title}</p>
          <p class="text-gray-600 dark:text-gray-400 text-xs mt-1">${notification.message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  const getNotificationIcon = (type) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'ALERT':
        return `<svg class="${iconClass} text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
      case 'WARNING':
        return `<svg class="${iconClass} text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
      case 'SUCCESS':
        return `<svg class="${iconClass} text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      default:
        return `<svg class="${iconClass} text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'URGENT') return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (type === 'ALERT') return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (type === 'WARNING') return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
    if (type === 'SUCCESS') return 'border-success-500 bg-success-50 dark:bg-success-900/20';
    return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col animate-fade-in-scale">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="badge badge-primary">{unreadCount} non lues</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    title="Tout marquer comme lu"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Chargement...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                      }`}
                      onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    >
                      <div className={`flex items-start space-x-3 border-l-4 p-3 rounded-r-lg ${getNotificationColor(notification.type, notification.priority)}`}>
                        <div className="flex-shrink-0 mt-1">
                          {notification.type === 'ALERT' && (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          {notification.type === 'WARNING' && (
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                          )}
                          {notification.type === 'SUCCESS' && (
                            <CheckCircle className="w-5 h-5 text-success-500" />
                          )}
                          {notification.type === 'INFO' && (
                            <Info className="w-5 h-5 text-primary-500" />
                          )}
                          {!['ALERT', 'WARNING', 'SUCCESS', 'INFO'].includes(notification.type) && (
                            <Info className="w-5 h-5 text-primary-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2 ml-2" />
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                            {notification.message}
                          </p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                            {new Date(notification.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationCenter;
