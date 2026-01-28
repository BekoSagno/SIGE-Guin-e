import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const gridService = {
  async triggerLoadShedding(zoneId, commandType) {
    const response = await apiClient.post(API_ENDPOINTS.GRID.LOAD_SHEDDING, {
      zoneId,
      commandType,
    });
    return response.data;
  },

  async getZones() {
    const response = await apiClient.get(API_ENDPOINTS.GRID.ZONES);
    return response.data;
  },

  async getTransformers() {
    const response = await apiClient.get(API_ENDPOINTS.GRID.TRANSFORMERS);
    return response.data;
  },
};
