import api from './api.js';

/**
 * Service de réconciliation énergétique (anti-fraude)
 */
export const reconciliationService = {
  /**
   * Récupère les données de réconciliation par zone
   * Calcul: Delta = Énergie_Sortie_Poste - Σ(Consommations_Boîtiers)
   */
  async getZonesReconciliation() {
    const response = await api.get('/reconciliation/zones');
    return response.data;
  },

  /**
   * Lance un calcul de réconciliation complet
   */
  async runReconciliation() {
    const response = await api.post('/reconciliation/run');
    return response.data;
  },

  /**
   * Crée un ticket d'audit pour une zone suspecte
   * @param {Object} ticket - Données du ticket
   * @param {string} ticket.zone - Nom de la zone
   * @param {Object} ticket.location - Coordonnées GPS suspectées
   * @param {number} ticket.estimatedLoss - Perte estimée en GNF
   * @param {number} ticket.deltaPercent - Pourcentage de delta
   */
  async createAuditTicket(ticket) {
    const response = await api.post('/reconciliation/ticket', ticket);
    return response.data;
  },

  /**
   * Récupère la liste des tickets d'audit
   * @param {Object} params - Paramètres de filtrage
   * @param {string} params.status - Filtrer par statut
   * @param {number} params.limit - Nombre max de résultats
   */
  async getAuditTickets(params = {}) {
    const response = await api.get('/reconciliation/tickets', { params });
    return response.data;
  },

  /**
   * Met à jour un ticket d'audit
   * @param {string} ticketId - ID du ticket
   * @param {Object} updates - Données à mettre à jour
   * @param {string} updates.status - Nouveau statut
   * @param {string} updates.resolutionNotes - Notes de résolution
   */
  async updateAuditTicket(ticketId, updates) {
    const response = await api.put(`/reconciliation/tickets/${ticketId}`, updates);
    return response.data;
  },
};

export default reconciliationService;
