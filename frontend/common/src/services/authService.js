import apiClient from './api.js';
import { API_ENDPOINTS } from '../constants/api.js';

export const authService = {
  async login(identifier, password) {
    // identifier peut être un email ou un ID SIGE
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      identifier, // email ou ID SIGE
      password,
    });
    
    // Ne stocker le token que si la connexion est directe (pas d'OTP requis)
    if (response.data.token && !response.data.requiresOTP) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  async register(userData) {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  },

  async verifyOTP(email, otp) {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      email,
      otp,
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  async resendOTP(email) {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESEND_OTP, {
      email,
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  getStoredUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },
};
