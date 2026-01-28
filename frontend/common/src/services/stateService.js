import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const stateService = {
  async getNationalStats() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.NATIONAL_STATS);
    return response.data;
  },

  async getFinancialGap() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.FINANCIAL_GAP);
    return response.data;
  },

  async getHydroPlanning() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.HYDRO_PLANNING);
    return response.data;
  },

  async getRuralPlanning() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.RURAL_PLANNING);
    return response.data;
  },

  async getPerformanceAudit() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.PERFORMANCE_AUDIT);
    return response.data;
  },

  async getSocialImpact() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.SOCIAL_IMPACT);
    return response.data;
  },

  async getMaintenancePredictive() {
    const response = await apiClient.get(API_ENDPOINTS.STATE.MAINTENANCE_PREDICTIVE);
    return response.data;
  },
};
