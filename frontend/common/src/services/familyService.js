import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const familyService = {
  async getMembers(homeId) {
    const response = await apiClient.get(`/family/members/${homeId}`);
    return response.data;
  },

  async inviteMember(homeId, email, role) {
    const response = await apiClient.post('/family/invite', {
      homeId,
      email,
      role,
    });
    return response.data;
  },

  async removeMember(homeId, userId) {
    const response = await apiClient.delete(`/family/members/${homeId}/${userId}`);
    return response.data;
  },
};
