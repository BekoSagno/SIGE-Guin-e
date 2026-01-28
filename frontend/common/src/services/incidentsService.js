import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const incidentsService = {
  async getIncidents() {
    const response = await apiClient.get(API_ENDPOINTS.INCIDENTS.LIST);
    return response.data;
  },

  async getIncident(incidentId) {
    const response = await apiClient.get(API_ENDPOINTS.INCIDENTS.GET.replace(':id', incidentId));
    return response.data;
  },

  async createIncident(incidentData) {
    const response = await apiClient.post(API_ENDPOINTS.INCIDENTS.CREATE, incidentData);
    return response.data;
  },

  async updateIncident(incidentId, updateData) {
    const response = await apiClient.put(
      API_ENDPOINTS.INCIDENTS.UPDATE.replace(':id', incidentId),
      updateData
    );
    return response.data;
  },

  async uploadPhoto(photoFile) {
    // Créer un FormData pour l'upload
    const formData = new FormData();
    formData.append('photo', photoFile);

    // Utiliser fetch directement pour FormData (axios peut avoir des problèmes avec les fichiers)
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.INCIDENTS.UPLOAD_PHOTO}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur lors de l\'upload' }));
      throw new Error(error.error || 'Erreur lors de l\'upload de la photo');
    }

    return response.json();
  },
};
