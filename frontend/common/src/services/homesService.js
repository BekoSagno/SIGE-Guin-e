import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const homesService = {
  async getHomes() {
    const response = await apiClient.get(API_ENDPOINTS.HOMES.LIST);
    return response.data;
  },

  async getHome(homeId) {
    const response = await apiClient.get(API_ENDPOINTS.HOMES.GET.replace(':id', homeId));
    return response.data;
  },

  async createHome(homeData) {
    const response = await apiClient.post(API_ENDPOINTS.HOMES.CREATE, homeData);
    return response.data;
  },

  async updateHome(homeId, homeData) {
    const response = await apiClient.put(
      API_ENDPOINTS.HOMES.UPDATE.replace(':id', homeId),
      homeData
    );
    return response.data;
  },

  async deleteHome(homeId) {
    const response = await apiClient.delete(API_ENDPOINTS.HOMES.DELETE.replace(':id', homeId));
    return response.data;
  },
};
