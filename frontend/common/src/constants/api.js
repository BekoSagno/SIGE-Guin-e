// Configuration API commune
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
  },
  // Energy
  ENERGY: {
    TELEMETRY: '/energy/telemetry',
    CONSUMPTION: '/energy/consumption',
    HISTORY: '/energy/history',
    DEVICE_COSTS: '/energy/device-costs',
    SMART_SAVE: '/energy/smart-save',
    SMART_SAVE_TOGGLE: '/energy/smart-save/toggle',
    SMART_SAVE_SETTINGS: '/energy/smart-save/settings',
    SMART_SAVE_STATS: '/energy/smart-save/stats',
    MAINTENANCE_DIAGNOSTICS: '/energy/maintenance/diagnostics',
    MAINTENANCE_ALERTS: '/energy/maintenance/alerts',
  },
  // Homes
  HOMES: {
    LIST: '/homes',
    CREATE: '/homes',
    GET: '/homes/:id',
    UPDATE: '/homes/:id',
    DELETE: '/homes/:id',
  },
  // Grid
  GRID: {
    LOAD_SHEDDING: '/grid/load-shedding',
    ZONES: '/grid/zones',
    TRANSFORMERS: '/grid/transformers',
  },
  // Incidents
  INCIDENTS: {
    LIST: '/incidents',
    CREATE: '/incidents',
    GET: '/incidents/:id',
    UPDATE: '/incidents/:id',
    UPLOAD_PHOTO: '/incidents/upload-photo',
  },
  // State
  STATE: {
    NATIONAL_STATS: '/state/national-stats',
    FINANCIAL_GAP: '/state/financial-gap',
    HYDRO_PLANNING: '/state/hydro-planning',
    RURAL_PLANNING: '/state/rural-planning',
    PERFORMANCE_AUDIT: '/state/performance-audit',
    SOCIAL_IMPACT: '/state/social-impact',
    MAINTENANCE_PREDICTIVE: '/state/maintenance-predictive',
  },
  // Meters
  METERS: {
    PAIR: '/meters/pair',
    GET: '/meters/:meterId',
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
    CREATE: '/notifications',
  },
  // ÉTAT-EDG Messages
  ETAT_EDG_MESSAGES: {
    LIST: '/etat-edg-messages',
    SEND: '/etat-edg-messages',
    MARK_READ: (id) => `/etat-edg-messages/${id}/read`,
  },
};

export const USER_ROLES = {
  CITOYEN: 'CITOYEN',
  AGENT_EDG: 'AGENT_EDG',
  ADMIN_ETAT: 'ADMIN_ETAT',
};

export const HOME_TYPES = {
  EDG: 'EDG',
  SOLAIRE: 'SOLAIRE',
  HYBRIDE: 'HYBRIDE',
};
