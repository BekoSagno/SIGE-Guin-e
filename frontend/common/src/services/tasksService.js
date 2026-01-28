import api from './api.js';

/**
 * Service de gestion des tâches assignées
 */
export const tasksService = {
  /**
   * Récupère la liste des tâches
   * @param {Object} params - Paramètres de filtrage
   */
  async getTasks(params = {}) {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  /**
   * Récupère mes tâches (pour les agents de terrain)
   * @param {Object} params - Paramètres de filtrage
   */
  async getMyTasks(params = {}) {
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },

  /**
   * Crée et assigne une tâche (SUPERVISEUR uniquement)
   * @param {Object} task - Données de la tâche
   */
  async createTask(task) {
    const response = await api.post('/tasks', task);
    return response.data;
  },

  /**
   * Accepte une tâche (AGENT_TERRAIN uniquement)
   * @param {string} taskId - ID de la tâche
   */
  async acceptTask(taskId) {
    const response = await api.put(`/tasks/${taskId}/accept`);
    return response.data;
  },

  /**
   * Démarre une tâche (AGENT_TERRAIN uniquement)
   * @param {string} taskId - ID de la tâche
   */
  async startTask(taskId) {
    const response = await api.put(`/tasks/${taskId}/start`);
    return response.data;
  },

  /**
   * Complète une tâche (AGENT_TERRAIN uniquement)
   * @param {string} taskId - ID de la tâche
   * @param {Object} completion - Données de complétion
   * @param {string} completion.completionReport - Rapport de complétion
   * @param {string} completion.completionPhotoUrl - URL de la photo (optionnel)
   */
  async completeTask(taskId, completion) {
    const formData = new FormData();
    formData.append('completionReport', completion.completionReport);
    if (completion.photo) {
      formData.append('photo', completion.photo);
    }

    const response = await api.put(`/tasks/${taskId}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Récupère les statistiques des tâches
   */
  async getStats() {
    const response = await api.get('/tasks/stats');
    return response.data;
  },
};

export default tasksService;
