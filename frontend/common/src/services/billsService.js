import apiClient from './api.js';

export const billsService = {
  /**
   * Récupérer les factures d'un foyer ou toutes les factures (pour EDG)
   */
  async getBills(homeId = null, status = null, limit = 50) {
    const params = { limit };
    if (homeId) params.homeId = homeId;
    if (status) params.status = status;
    
    const response = await apiClient.get('/bills', { params });
    return response.data;
  },

  /**
   * Créer une nouvelle facture EDG (réservé aux agents EDG)
   */
  async createBill(billData) {
    const response = await apiClient.post('/bills', billData);
    return response.data;
  },

  /**
   * Payer une facture
   */
  async payBill(billId, paymentData) {
    const response = await apiClient.post(`/bills/${billId}/pay`, paymentData);
    return response.data;
  },

  /**
   * Récupérer les rapports de paiement (réservé aux agents EDG)
   */
  async getReports(startDate = null, endDate = null, homeId = null, status = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (homeId) params.homeId = homeId;
    if (status) params.status = status;
    
    const response = await apiClient.get('/bills/reports', { params });
    return response.data;
  },
};
