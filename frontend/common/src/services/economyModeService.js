import apiClient from './api.js';

export const economyModeService = {
  /**
   * Récupérer les paramètres du mode économie pour un foyer
   */
  async getSettings(homeId) {
    const response = await apiClient.get(`/economy-mode/settings?homeId=${homeId}`);
    return response.data;
  },

  /**
   * Activer/désactiver le mode économie
   */
  async toggle(homeId, enabled, triggerType = 'MANUAL') {
    const response = await apiClient.post('/economy-mode/toggle', {
      homeId,
      enabled,
      triggerType,
    });
    return response.data;
  },

  /**
   * Mettre à jour les paramètres du mode économie
   */
  async updateSettings(homeId, settings) {
    const response = await apiClient.put('/economy-mode/settings', {
      homeId,
      ...settings,
    });
    return response.data;
  },

  /**
   * Définir la priorité d'un appareil
   */
  async setDevicePriority(deviceId, homeId, priorityLevel, source = 'MANUAL') {
    const response = await apiClient.post('/economy-mode/device-priority', {
      deviceId,
      homeId,
      priorityLevel,
      source,
    });
    return response.data;
  },

  /**
   * Récupérer les statistiques d'économie
   */
  async getStats(homeId, period = 'week') {
    const response = await apiClient.get(`/economy-mode/stats?homeId=${homeId}&period=${period}`);
    return response.data;
  },

  /**
   * Récupérer les recommandations IA
   */
  async getRecommendations(homeId) {
    const response = await apiClient.get(`/economy-mode/recommendations?homeId=${homeId}`);
    return response.data;
  },
};
