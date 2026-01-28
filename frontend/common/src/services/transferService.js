import apiClient from './api.js';

export const transferService = {
  /**
   * Effectuer un transfert d'énergie/crédit entre deux foyers
   */
  async transferEnergy(fromHomeId, toHomeId, amount, unit = 'GNF') {
    const response = await apiClient.post('/transfer', {
      fromHomeId,
      toHomeId,
      amount,
      unit,
    });
    return response.data;
  },

  /**
   * Récupérer l'historique des transferts
   */
  async getHistory(limit = 20) {
    const response = await apiClient.get('/transfer/history', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Récupérer le solde d'un foyer
   */
  async getBalance(homeId) {
    const response = await apiClient.get(`/transfer/balance/${homeId}`);
    return response.data;
  },
};
