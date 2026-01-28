import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const notificationService = {
  async getNotifications(unreadOnly = false, limit = 50) {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
      params: { unread_only: unreadOnly, limit },
    });
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    return response.data;
  },

  async markAllAsRead() {
    // Récupérer toutes les notifications non lues et les marquer
    const { notifications } = await this.getNotifications(true);
    await Promise.all(notifications.map(n => this.markAsRead(n.id)));
    return { success: true };
  },

  async createNotification(notificationData) {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.CREATE, notificationData);
    return response.data;
  },
};
