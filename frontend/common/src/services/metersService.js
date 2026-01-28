import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const metersService = {
  /**
   * Appaire un kit IoT à un foyer
   * @param {string} meterId - ID du kit IoT (depuis QR code)
   * @param {string} homeId - ID du foyer
   * @param {string} pairingKey - Clé d'appairage (depuis QR code)
   */
  async pairMeter(meterId, homeId, pairingKey) {
    const response = await apiClient.post(API_ENDPOINTS.METERS.PAIR, {
      meterId,
      homeId,
      pairingKey,
    });
    return response.data;
  },

  /**
   * Récupère les informations d'un kit IoT
   * @param {string} meterId - ID du kit IoT
   */
  async getMeter(meterId) {
    const response = await apiClient.get(API_ENDPOINTS.METERS.GET.replace(':meterId', meterId));
    return response.data;
  },
};
