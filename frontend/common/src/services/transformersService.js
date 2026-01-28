import api from './api.js';

/**
 * Service de gestion des transformateurs et maintenance prédictive
 */
export const transformersService = {
  /**
   * Récupère la liste de tous les transformateurs avec leur état de santé
   */
  async getTransformers() {
    const response = await api.get('/transformers');
    return response.data;
  },

  /**
   * Récupère les détails d'un transformateur spécifique
   * @param {string} transformerId - ID du transformateur (ex: TRANS-DIXINN-001)
   */
  async getTransformerDetails(transformerId) {
    const response = await api.get(`/transformers/${transformerId}`);
    return response.data;
  },

  /**
   * Planifie ou enregistre une maintenance
   * @param {string} transformerId - ID du transformateur
   * @param {Object} maintenance - Données de maintenance
   * @param {string} maintenance.maintenanceType - Type (PREVENTIVE, CORRECTIVE, INSPECTION)
   * @param {string} maintenance.description - Description des travaux
   * @param {string} maintenance.scheduledAt - Date programmée (optionnel)
   * @param {number} maintenance.cost - Coût estimé en GNF
   */
  async scheduleMaintenance(transformerId, maintenance) {
    const response = await api.post(`/transformers/${transformerId}/maintenance`, maintenance);
    return response.data;
  },

  /**
   * Récupère les statistiques globales des transformateurs
   */
  async getStatsSummary() {
    const response = await api.get('/transformers/stats/summary');
    return response.data;
  },

  /**
   * Récupère l'historique de maintenance d'un transformateur
   * @param {string} transformerId - ID du transformateur
   */
  async getMaintenanceHistory(transformerId) {
    const response = await api.get(`/transformers/${transformerId}`);
    return response.data.maintenanceHistory || [];
  },

  /**
   * Récupère les anomalies détectées sur un transformateur
   * @param {string} transformerId - ID du transformateur
   */
  async getAnomalies(transformerId) {
    const response = await api.get(`/transformers/${transformerId}`);
    return response.data.anomalies || [];
  },
};

export default transformersService;
