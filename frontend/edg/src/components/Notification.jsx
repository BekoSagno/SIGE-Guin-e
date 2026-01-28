import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Zap, Shield } from 'lucide-react';

// Contexte pour les notifications
const NotificationContext = createContext(null);

// Types de notifications avec leurs styles
const NOTIFICATION_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-gradient-to-r from-success-500 to-success-600',
    borderColor: 'border-success-400',
    iconBg: 'bg-success-400/20',
    progressColor: 'bg-success-300',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-gradient-to-r from-red-500 to-red-600',
    borderColor: 'border-red-400',
    iconBg: 'bg-red-400/20',
    progressColor: 'bg-red-300',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-gradient-to-r from-amber-500 to-amber-600',
    borderColor: 'border-amber-400',
    iconBg: 'bg-amber-400/20',
    progressColor: 'bg-amber-300',
  },
  info: {
    icon: Info,
    bgColor: 'bg-gradient-to-r from-primary-500 to-primary-600',
    borderColor: 'border-primary-400',
    iconBg: 'bg-primary-400/20',
    progressColor: 'bg-primary-300',
  },
  grid: {
    icon: Zap,
    bgColor: 'bg-gradient-to-r from-purple-500 to-purple-600',
    borderColor: 'border-purple-400',
    iconBg: 'bg-purple-400/20',
    progressColor: 'bg-purple-300',
  },
  fraud: {
    icon: Shield,
    bgColor: 'bg-gradient-to-r from-rose-500 to-rose-600',
    borderColor: 'border-rose-400',
    iconBg: 'bg-rose-400/20',
    progressColor: 'bg-rose-300',
  },
};

// Composant d'une notification individuelle
function NotificationItem({ notification, onClose }) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const type = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info;
  const Icon = type.icon;
  const duration = notification.duration || 4000;

  useEffect(() => {
    if (notification.persistent) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, notification.persistent]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl shadow-2xl border-l-4 ${type.borderColor}
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${notification.isNew ? 'animate-slide-in-right' : ''}
      `}
    >
      <div className={`${type.bgColor} p-4`}>
        <div className="flex items-start space-x-3">
          {/* Icône */}
          <div className={`${type.iconBg} p-2 rounded-lg flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {notification.title && (
              <h4 className="text-white font-bold text-sm mb-0.5">
                {notification.title}
              </h4>
            )}
            <p className="text-white/90 text-sm leading-relaxed">
              {notification.message}
            </p>
            
            {/* Actions optionnelles */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex items-center space-x-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick?.();
                      if (action.closeOnClick !== false) handleClose();
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${action.primary 
                        ? 'bg-white text-gray-800 hover:bg-gray-100' 
                        : 'bg-white/20 text-white hover:bg-white/30'}
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Barre de progression */}
      {!notification.persistent && (
        <div className="h-1 bg-black/20">
          <div
            className={`h-full ${type.progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Conteneur des notifications
function NotificationContainer({ notifications, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem notification={notification} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

// Provider des notifications
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [
      ...prev,
      { ...notification, id, isNew: true },
    ]);

    // Retirer le flag isNew après l'animation
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isNew: false } : n))
      );
    }, 500);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Helpers pour chaque type
  const notify = {
    success: (message, options = {}) =>
      addNotification({ type: 'success', message, ...options }),
    error: (message, options = {}) =>
      addNotification({ type: 'error', message, duration: 6000, ...options }),
    warning: (message, options = {}) =>
      addNotification({ type: 'warning', message, ...options }),
    info: (message, options = {}) =>
      addNotification({ type: 'info', message, ...options }),
    grid: (message, options = {}) =>
      addNotification({ type: 'grid', message, ...options }),
    fraud: (message, options = {}) =>
      addNotification({ type: 'fraud', message, duration: 8000, ...options }),
    custom: (notification) => addNotification(notification),
    remove: removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

// Hook pour utiliser les notifications
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Composant de confirmation (remplace window.confirm)
export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirmation',
  message = 'Êtes-vous sûr de vouloir continuer ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning' // 'warning', 'danger', 'info'
}) {
  const [isExiting, setIsExiting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onConfirm();
    }, 200);
  };

  const typeStyles = {
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600',
    },
    danger: {
      icon: XCircle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      confirmBtn: 'bg-red-500 hover:bg-red-600',
    },
    info: {
      icon: Info,
      iconBg: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
      confirmBtn: 'bg-primary-500 hover:bg-primary-600',
    },
  };

  const style = typeStyles[type] || typeStyles.warning;
  const Icon = style.icon;

  return (
    <div 
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div 
        className={`
          relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full
          transform transition-all duration-200
          ${isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        `}
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`${style.iconBg} p-3 rounded-xl flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${style.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg ${style.confirmBtn} text-white font-semibold transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationProvider;
