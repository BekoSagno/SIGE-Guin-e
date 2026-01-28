import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const energyService = {
  async sendTelemetry(meterId, data) {
    const response = await apiClient.post(API_ENDPOINTS.ENERGY.TELEMETRY, {
      meterId,
      ...data,
    });
    return response.data;
  },

  async getConsumption(homeId, startDate, endDate) {
    const response = await apiClient.get(API_ENDPOINTS.ENERGY.CONSUMPTION, {
      params: {
        homeId,
        startDate,
        endDate,
      },
    });
    return response.data;
  },

  async getHistory(meterId, limit = 100) {
    const response = await apiClient.get(API_ENDPOINTS.ENERGY.HISTORY, {
      params: {
        meterId,
        limit,
      },
    });
    return response.data;
  },

  async getDeviceCosts(homeId, period = '24h') {
    const response = await apiClient.get(API_ENDPOINTS.ENERGY.DEVICE_COSTS, {
      params: {
        homeId,
        period,
      },
    });
    return response.data;
  },

  async getDevices(homeId) {
    const response = await apiClient.get('/energy/devices', {
      params: { homeId },
    });
    return response.data;
  },

  async controlDevice(deviceId, homeId, action) {
    const response = await apiClient.post(`/energy/devices/${deviceId}/control`, {
      action,
      homeId,
    });
    return response.data;
  },

  async addDevice(homeId, name, type, powerRating) {
    const response = await apiClient.post('/energy/devices', {
      homeId,
      name,
      type,
      powerRating,
    });
    return response.data;
  },
};
