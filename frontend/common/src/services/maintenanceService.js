import apiClient from './api.js';

export const maintenanceService = {
  /**
   * Récupérer les diagnostics IA pour tous les appareils d'un foyer
   */
  async getDiagnostics(homeId) {
    const response = await apiClient.get(`/energy/maintenance/diagnostics?homeId=${homeId}`);
    return response.data;
  },

  /**
   * Récupérer les alertes de maintenance prédictive
   */
  async getAlerts(homeId) {
    const response = await apiClient.get(`/energy/maintenance/alerts?homeId=${homeId}`);
    return response.data;
  },
};
