import api from './api.js';

/**
 * Service de gestion du personnel EDG
 */
export const personnelService = {
  /**
   * Récupère la liste des employés EDG
   */
  async getEmployees() {
    const response = await api.get('/personnel');
    return response.data;
  },

  /**
   * Récupère les détails d'un employé
   * @param {string} employeeId - ID de l'employé
   */
  async getEmployee(employeeId) {
    const response = await api.get(`/personnel/${employeeId}`);
    return response.data;
  },

  /**
   * Crée un nouvel employé (ADMIN_SYSTEME uniquement)
   * @param {Object} employee - Données de l'employé
   */
  async createEmployee(employee) {
    const response = await api.post('/personnel', employee);
    return response.data;
  },

  /**
   * Met à jour un employé
   * @param {string} employeeId - ID de l'employé
   * @param {Object} updates - Données à mettre à jour
   */
  async updateEmployee(employeeId, updates) {
    const response = await api.put(`/personnel/${employeeId}`, updates);
    return response.data;
  },

  /**
   * Met à jour la géolocalisation d'un agent
   * @param {string} employeeId - ID de l'employé
   * @param {Object} location - Coordonnées GPS
   * @param {number} location.lat - Latitude
   * @param {number} location.lng - Longitude
   */
  async updateLocation(employeeId, location) {
    const response = await api.post(`/personnel/${employeeId}/location`, location);
    return response.data;
  },

  /**
   * Récupère les agents disponibles pour assignation
   * @param {Object} params - Paramètres de filtrage
   * @param {string} params.zone - Filtrer par zone
   */
  async getAvailableAgents(params = {}) {
    const response = await api.get('/personnel/available-agents', { params });
    return response.data;
  },

  /**
   * Récupère les comptes en attente de validation (ADMIN_SYSTEME uniquement)
   */
  async getPendingUsers() {
    const response = await api.get('/personnel/pending');
    return response.data;
  },

  /**
   * Valide un compte en attente et assigne un sous-rôle (ADMIN_SYSTEME uniquement)
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} data - Données de validation
   * @param {string} data.edgSubrole - Sous-rôle à assigner
   * @param {string} data.zoneAssigned - Zone assignée (optionnel)
   * @param {string} data.supervisorId - ID du superviseur (optionnel)
   */
  async validateUser(userId, data) {
    const response = await api.put(`/personnel/${userId}/validate`, data);
    return response.data;
  },

  /**
   * Récupère les logs d'audit (ADMIN_SYSTEME uniquement)
   * @param {Object} params - Paramètres de pagination et filtrage
   */
  async getAuditLogs(params = {}) {
    const response = await api.get('/personnel/audit-logs', { params });
    return response.data;
  },

  /**
   * Récupère les comptes en attente de validation (ADMIN_SYSTEME uniquement)
   */
  async getPendingUsers() {
    const response = await api.get('/personnel/pending');
    return response.data;
  },

  /**
   * Valide un compte en attente et assigne un sous-rôle (ADMIN_SYSTEME uniquement)
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} validationData - Données de validation
   * @param {string} validationData.edgSubrole - Sous-rôle à assigner
   * @param {string} validationData.zoneAssigned - Zone assignée (optionnel)
   * @param {string} validationData.supervisorId - ID du superviseur (optionnel)
   */
  async validateUser(userId, validationData) {
    const response = await api.put(`/personnel/${userId}/validate`, validationData);
    return response.data;
  },
};

export default personnelService;
