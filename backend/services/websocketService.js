import { WebSocketServer } from 'ws';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
  }

  /**
   * Initialise le serveur WebSocket
   */
  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true
    });

    this.wss.on('connection', async (ws, req) => {
      console.log('🔌 Nouvelle connexion WebSocket');

      // Extraire le token JWT de l'URL ou des headers
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.warn('⚠️ Connexion WebSocket sans token, fermeture');
        ws.close(1008, 'Token manquant');
        return;
      }

      // Décoder le token pour obtenir l'utilisateur
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars');
        
        const userId = decoded.userId;
        
        // Ajouter le client à la liste
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(ws);

        // Stocker l'userId dans la connexion
        ws.userId = userId;

        console.log(`✅ Client WebSocket connecté: ${userId}`);

        // Gérer la déconnexion
        ws.on('close', () => {
          console.log(`🔌 Client WebSocket déconnecté: ${userId}`);
          if (this.clients.has(userId)) {
            this.clients.get(userId).delete(ws);
            if (this.clients.get(userId).size === 0) {
              this.clients.delete(userId);
            }
          }
        });

        // Gérer les erreurs
        ws.on('error', (error) => {
          console.error('❌ Erreur WebSocket:', error);
        });

        // Envoyer un message de bienvenue
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Connexion WebSocket établie'
        }));

      } catch (error) {
        console.error('❌ Erreur authentification WebSocket:', error);
        ws.close(1008, 'Token invalide');
      }
    });

    console.log('✅ Serveur WebSocket initialisé sur /ws');
  }

  /**
   * Envoie un message à un utilisateur spécifique
   */
  sendToUser(userId, message) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      const messageStr = JSON.stringify(message);
      
      userClients.forEach((ws) => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(messageStr);
        }
      });
      
      console.log(`📤 Message envoyé à l'utilisateur ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Envoie un message à tous les utilisateurs d'une zone
   */
  async sendToZone(zoneId, message) {
    try {
      const { querySQLObjects } = await import('./sqlService.js');
      
      // Récupérer tous les utilisateurs propriétaires de foyers dans cette zone
      const homes = await querySQLObjects(
        'SELECT DISTINCT proprietaire_id FROM homes WHERE ville = $1',
        [zoneId],
        ['proprietaire_id']
      );

      let sentCount = 0;
      for (const home of homes) {
        if (this.sendToUser(home.proprietaire_id, message)) {
          sentCount++;
        }
      }

      // Récupérer aussi les membres de famille dans cette zone
      const members = await querySQLObjects(
        `SELECT DISTINCT hm.user_id 
         FROM home_members hm
         JOIN homes h ON hm.home_id = h.id
         WHERE h.ville = $1`,
        [zoneId],
        ['user_id']
      );

      for (const member of members) {
        if (this.sendToUser(member.user_id, message)) {
          sentCount++;
        }
      }

      console.log(`📤 Message envoyé à ${sentCount} utilisateur(s) de la zone ${zoneId}`);
      return sentCount;
    } catch (error) {
      console.error('❌ Erreur envoi message zone:', error);
      return 0;
    }
  }

  /**
   * Envoie un message à tous les clients connectés
   */
  broadcast(message) {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr);
        sentCount++;
      }
    });

    console.log(`📢 Message diffusé à ${sentCount} client(s)`);
    return sentCount;
  }

  /**
   * Obtient le nombre de clients connectés
   */
  getClientCount() {
    return this.wss ? this.wss.clients.size : 0;
  }
}

// Instance singleton
const websocketService = new WebSocketService();

export default websocketService;
