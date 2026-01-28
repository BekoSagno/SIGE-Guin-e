import apiClient from './api.js';

export const deviceScheduleService = {
  /**
   * Récupérer tous les programmes d'un foyer
   */
  async getSchedules(homeId) {
    const response = await apiClient.get(`/schedules?homeId=${homeId}`);
    return response.data;
  },

  /**
   * Créer un nouveau programme manuel
   */
  async createSchedule(homeId, deviceId, deviceSource, deviceName, schedule) {
    const response = await apiClient.post('/schedules', {
      homeId,
      deviceId,
      deviceSource,
      deviceName,
      ...schedule,
    });
    return response.data;
  },

  /**
   * Modifier un programme existant
   */
  async updateSchedule(scheduleId, updates) {
    const response = await apiClient.put(`/schedules/${scheduleId}`, updates);
    return response.data;
  },

  /**
   * Supprimer un programme
   */
  async deleteSchedule(scheduleId) {
    const response = await apiClient.delete(`/schedules/${scheduleId}`);
    return response.data;
  },

  /**
   * Activer/désactiver un programme
   */
  async toggleSchedule(scheduleId) {
    const response = await apiClient.post(`/schedules/${scheduleId}/toggle`);
    return response.data;
  },

  /**
   * Récupérer les suggestions IA
   */
  async getAISuggestions(homeId) {
    const response = await apiClient.get(`/schedules/ai-suggestions?homeId=${homeId}`);
    return response.data;
  },

  /**
   * Accepter une suggestion IA
   */
  async acceptSuggestion(suggestionId) {
    const response = await apiClient.post(`/schedules/ai-suggestions/${suggestionId}/accept`);
    return response.data;
  },

  /**
   * Rejeter une suggestion IA
   */
  async rejectSuggestion(suggestionId) {
    const response = await apiClient.post(`/schedules/ai-suggestions/${suggestionId}/reject`);
    return response.data;
  },

  /**
   * Logger l'utilisation d'un appareil (pour apprentissage IA)
   */
  async logUsage(homeId, deviceId, deviceSource, action, durationMinutes, wasUseful) {
    const response = await apiClient.post('/schedules/log-usage', {
      homeId,
      deviceId,
      deviceSource,
      action,
      durationMinutes,
      wasUseful,
    });
    return response.data;
  },
};
