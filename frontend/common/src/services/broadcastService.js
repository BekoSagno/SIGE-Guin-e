import api from './api.js';

/**
 * Service de diffusion de messages aux usagers
 */
export const broadcastService = {
  /**
   * Récupère la structure hiérarchique des zones pour le ciblage
   */
  async getZones() {
    const response = await api.get('/broadcast/zones');
    return response.data;
  },

  /**
   * Recherche des clients individuels
   * @param {Object} params - Paramètres de recherche
   * @param {string} params.search - Terme de recherche
   * @param {string} params.zone - Filtrer par zone
   * @param {number} params.limit - Nombre max de résultats
   */
  async searchClients(params = {}) {
    const response = await api.get('/broadcast/clients', { params });
    return response.data;
  },

  /**
   * Envoie un message de diffusion
   * @param {Object} message - Données du message
   * @param {string} message.title - Titre du message
   * @param {string} message.content - Contenu du message
   * @param {string} message.messageType - Type (info, warning, danger, success)
   * @param {string} message.targetMode - Mode de ciblage (zone, individual)
   * @param {Array} message.targets - Liste des cibles (zones ou IDs utilisateurs)
   * @param {string} message.scheduledAt - Date/heure programmée (optionnel)
   */
  async sendMessage(message) {
    const response = await api.post('/broadcast/send', message);
    return response.data;
  },

  /**
   * Récupère l'historique des messages envoyés
   * @param {Object} params - Paramètres de pagination
   * @param {number} params.limit - Nombre de messages par page
   * @param {number} params.offset - Décalage
   */
  async getHistory(params = {}) {
    const response = await api.get('/broadcast/history', { params });
    return response.data;
  },

  /**
   * Récupère les modèles de messages
   */
  async getTemplates() {
    const response = await api.get('/broadcast/templates');
    return response.data;
  },

  /**
   * Annule un message programmé
   * @param {string} messageId - ID du message à annuler
   */
  async cancelMessage(messageId) {
    const response = await api.delete(`/broadcast/${messageId}`);
    return response.data;
  },

  /**
   * Récupère les messages reçus par l'utilisateur (pour citoyens)
   * @param {Object} params - Paramètres de pagination
   * @param {number} params.limit - Nombre de messages par page
   * @param {number} params.offset - Décalage
   */
  async getReceivedMessages(params = {}) {
    const response = await api.get('/broadcast/received', { params });
    return response.data;
  },
};

export default broadcastService;
