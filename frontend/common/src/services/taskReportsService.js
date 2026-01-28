import apiClient from './api.js';

const API_BASE = '/api/task-reports';

export const taskReportsService = {
  /**
   * Générer un nouveau rapport
   */
  async generateReport(reportData) {
    const response = await apiClient.post(`${API_BASE}/generate`, reportData);
    return response.data;
  },

  /**
   * Récupérer tous les rapports
   */
  async getReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.reportType) params.append('reportType', filters.reportType);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await apiClient.get(`${API_BASE}?${params.toString()}`);
    return response.data;
  },

  /**
   * Récupérer un rapport détaillé
   */
  async getReport(reportId) {
    const response = await apiClient.get(`${API_BASE}/${reportId}`);
    return response.data;
  },

  /**
   * Récupérer les statistiques globales des rapports
   */
  async getStats() {
    const response = await apiClient.get(`${API_BASE}/stats/overview`);
    return response.data;
  },
};

export default taskReportsService;
