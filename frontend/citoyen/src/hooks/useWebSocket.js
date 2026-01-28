import { useEffect, useRef, useState, useCallback } from 'react';
import { authService } from '@common/services';

/**
 * Hook personnalisé pour gérer la connexion WebSocket
 * @param {string} url - URL du serveur WebSocket
 * @param {object} options - Options de connexion
 * @returns {object} - État et méthodes de la connexion WebSocket
 */
export function useWebSocket(url, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000;

  const connect = useCallback(() => {
    try {
      // Récupérer le token JWT
      const token = authService.getToken();
      if (!token) {
        console.warn('⚠️ Pas de token disponible pour WebSocket');
        return;
      }

      // Construire l'URL avec le token
      const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
      
      // Créer la connexion WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connexion WebSocket établie');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Appeler le callback si fourni
          if (options.onMessage) {
            options.onMessage(data);
          }
        } catch (err) {
          console.error('❌ Erreur parsing message WebSocket:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('❌ Erreur WebSocket:', err);
        setError('Erreur de connexion WebSocket');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 Connexion WebSocket fermée:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Tentative de reconnexion automatique
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Tentative de reconnexion ${reconnectAttemptsRef.current}/${maxReconnectAttempts}...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
          setError('Impossible de se reconnecter au serveur');
        }
      };
    } catch (err) {
      console.error('❌ Erreur création WebSocket:', err);
      setError(err.message);
    }
  }, [url, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = maxReconnectAttempts; // Empêcher la reconnexion
  }, [maxReconnectAttempts]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('⚠️ WebSocket non connecté, impossible d\'envoyer le message');
    return false;
  }, []);

  useEffect(() => {
    if (options.enabled !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.enabled]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}
