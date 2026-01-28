import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const etatEdgMessageService = {
  async getConversations() {
    const response = await apiClient.get(API_ENDPOINTS.ETAT_EDG_MESSAGES.LIST);
    return response.data;
  },

  async sendMessage(messageData) {
    const response = await apiClient.post(API_ENDPOINTS.ETAT_EDG_MESSAGES.SEND, messageData);
    return response.data;
  },

  async markAsRead(messageId) {
    const response = await apiClient.put(API_ENDPOINTS.ETAT_EDG_MESSAGES.MARK_READ(messageId));
    return response.data;
  },
};
