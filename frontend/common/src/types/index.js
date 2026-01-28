// Types et interfaces communes (JSDoc pour JavaScript)

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} nom
 * @property {string} email
 * @property {'CITOYEN' | 'AGENT_EDG' | 'ADMIN_ETAT'} role
 */

/**
 * @typedef {Object} Home
 * @property {string} id
 * @property {string} nom
 * @property {string} ville
 * @property {'EDG' | 'SOLAIRE' | 'HYBRIDE'} type
 * @property {number} [latitude]
 * @property {number} [longitude]
 */

/**
 * @typedef {Object} Meter
 * @property {string} id
 * @property {string} homeId
 * @property {string} firmwareVersion
 * @property {'ONLINE' | 'OFFLINE'} status
 */

/**
 * @typedef {Object} EnergyData
 * @property {string} id
 * @property {string} meterId
 * @property {Date} timestamp
 * @property {number} [voltage]
 * @property {number} [current]
 * @property {number} [power]
 * @property {'GRID' | 'SOLAR' | 'BATTERY'} energySource
 */

/**
 * @typedef {Object} Financial
 * @property {string} id
 * @property {string} homeId
 * @property {number} balance
 * @property {Date} [lastTopup]
 * @property {number} [monthlyBudget]
 */
