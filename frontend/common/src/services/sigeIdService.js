import api from './api.js';

/**
 * Service de gestion des IDs SIGE
 */
export const sigeIdService = {
  /**
   * Recherche un client par son ID SIGE
   * @param {string} sigeId - ID SIGE au format GUI-ZONE-NUMERO
   */
  async searchClient(sigeId) {
    const response = await api.get(`/sige-id/search/${sigeId}`);
    return response.data;
  },

  /**
   * Génère manuellement un ID SIGE pour un utilisateur (ADMIN uniquement)
   * @param {string} userId - ID de l'utilisateur
   */
  async generateSigeId(userId) {
    const response = await api.get(`/sige-id/generate/${userId}`);
    return response.data;
  },

  /**
   * Récupère les statistiques sur les IDs SIGE (ADMIN uniquement)
   */
  async getStats() {
    const response = await api.get('/sige-id/stats');
    return response.data;
  },
};

export default sigeIdService;
