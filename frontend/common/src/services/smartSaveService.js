import apiClient from './api.js';

export const smartSaveService = {
  /**
   * Récupérer le statut Smart Save pour un foyer
   */
  async getStatus(homeId) {
    const response = await apiClient.get(`/energy/smart-save?homeId=${homeId}`);
    return response.data;
  },

  /**
   * Activer/désactiver Smart Save
   */
  async toggle(homeId, deviceId, enabled, settings) {
    const response = await apiClient.post('/energy/smart-save/toggle', {
      homeId,
      deviceId,
      enabled,
      settings,
    });
    return response.data;
  },

  /**
   * Mettre à jour les paramètres Smart Save
   */
  async updateSettings(homeId, deviceId, settings) {
    const response = await apiClient.put('/energy/smart-save/settings', {
      homeId,
      deviceId,
      settings,
    });
    return response.data;
  },

  /**
   * Récupérer les statistiques d'économie
   */
  async getStats(homeId) {
    const response = await apiClient.get(`/energy/smart-save/stats?homeId=${homeId}`);
    return response.data;
  },
};
