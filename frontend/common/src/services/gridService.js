import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const gridService = {
  async triggerLoadShedding(zoneId, commandType, targetRelays = null) {
    const response = await apiClient.post(API_ENDPOINTS.GRID.LOAD_SHEDDING, {
      zoneId,
      commandType,
      targetRelays, // Array de relais à cibler: ['POWER', 'LIGHTS_PLUGS'] ou null pour tous
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

  async getZoneRelays(zoneId) {
    const response = await apiClient.get(API_ENDPOINTS.GRID.ZONE_RELAYS(zoneId));
    return response.data;
  },
};
