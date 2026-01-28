/**
 * Service SQL pour exécuter des requêtes via docker exec
 * Workaround pour le problème de connexion PostgreSQL sur Windows
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Exécute une requête SQL SELECT et retourne les résultats
 * @param {string} sql - Requête SQL
 * @param {Array} params - Paramètres (optionnel)
 * @returns {Promise<Array>} - Résultats
 */
export async function querySQL(sql, params = []) {
  try {
    // Échapper les paramètres pour la sécurité
    let safeSql = sql;
    params.forEach((param, index) => {
      const escaped = typeof param === 'string' 
        ? param.replace(/'/g, "''").replace(/"/g, '\\"') 
        : param;
      safeSql = safeSql.replace(`$${index + 1}`, `'${escaped}'`);
    });
    
    // Supprimer les sauts de ligne et espaces multiples pour la commande shell
    safeSql = safeSql.replace(/\s+/g, ' ').trim();
    
    // Exécuter via docker exec avec format JSON pour faciliter le parsing
    const command = `docker exec sige-postgres psql -U postgres -d sige_guinee -t -A -F "|" -c "${safeSql}"`;
    const { stdout } = await execAsync(command);
    
    if (!stdout.trim()) {
      return [];
    }
    
    // Parser la sortie (format délimité par |)
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values = line.split('|').map(v => v.trim());
      return values;
    });
  } catch (error) {
    console.error('Erreur querySQL:', error.message);
    throw error;
  }
}

/**
 * Exécute une requête SQL SELECT et retourne les résultats sous forme d'objets
 * @param {string} sql - Requête SQL avec colonnes
 * @param {Array} params - Paramètres
 * @param {Array} columns - Noms des colonnes dans l'ordre
 * @returns {Promise<Array<Object>>} - Résultats sous forme d'objets
 */
export async function querySQLObjects(sql, params = [], columns = []) {
  const rows = await querySQL(sql, params);
  return rows.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

/**
 * Exécute une requête SQL INSERT/UPDATE/DELETE
 * @param {string} sql - Requête SQL
 * @param {Array} params - Paramètres
 * @returns {Promise<{rowCount: number, rows: Array}>} - Résultat
 */
export async function executeSQL(sql, params = []) {
  try {
    let safeSql = sql;
    params.forEach((param, index) => {
      const escaped = typeof param === 'string' 
        ? param.replace(/'/g, "''").replace(/"/g, '\\"') 
        : param;
      safeSql = safeSql.replace(`$${index + 1}`, `'${escaped}'`);
    });
    
    // Supprimer les sauts de ligne et espaces multiples pour la commande shell
    safeSql = safeSql.replace(/\s+/g, ' ').trim();
    
    const command = `docker exec sige-postgres psql -U postgres -d sige_guinee -c "${safeSql}"`;
    const { stdout } = await execAsync(command);
    
    // Extraire le nombre de lignes affectées
    const match = stdout.match(/INSERT|UPDATE|DELETE|(\d+)/);
    const rowCount = match ? parseInt(match[1] || '0') : 0;
    
    return { rowCount, rows: [] };
  } catch (error) {
    console.error('Erreur executeSQL:', error.message);
    throw error;
  }
}

/**
 * Exécute une requête SQL INSERT avec RETURNING
 * @param {string} sql - Requête SQL INSERT ... RETURNING
 * @param {Array} params - Paramètres
 * @param {Array} columns - Noms des colonnes retournées
 * @returns {Promise<Object>} - Ligne insérée
 */
export async function insertSQL(sql, params = [], columns = []) {
  try {
    let safeSql = sql;
    params.forEach((param, index) => {
      const escaped = typeof param === 'string' 
        ? param.replace(/'/g, "''").replace(/"/g, '\\"') 
        : param;
      safeSql = safeSql.replace(`$${index + 1}`, `'${escaped}'`);
    });
    
    const command = `docker exec sige-postgres psql -U postgres -d sige_guinee -t -A -F "|" -c "${safeSql}"`;
    const { stdout } = await execAsync(command);
    
    if (!stdout.trim()) {
      return null;
    }
    
    const values = stdout.trim().split('|').map(v => v.trim());
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = values[index];
    });
    return obj;
  } catch (error) {
    console.error('Erreur insertSQL:', error.message);
    throw error;
  }
}

/**
 * Exécute une requête SQL COUNT
 * @param {string} sql - Requête SQL SELECT COUNT(*)
 * @param {Array} params - Paramètres
 * @returns {Promise<number>} - Nombre
 */
export async function countSQL(sql, params = []) {
  try {
    let safeSql = sql;
    params.forEach((param, index) => {
      const escaped = typeof param === 'string' 
        ? param.replace(/'/g, "''").replace(/"/g, '\\"') 
        : param;
      safeSql = safeSql.replace(`$${index + 1}`, `'${escaped}'`);
    });
    
    const command = `docker exec sige-postgres psql -U postgres -d sige_guinee -t -A -c "${safeSql}"`;
    const { stdout } = await execAsync(command);
    
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    console.error('Erreur countSQL:', error.message);
    return 0;
  }
}

/**
 * Génère un UUID v4
 * @returns {string} - UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Formate une date pour PostgreSQL
 * @param {Date} date - Date
 * @returns {string} - Date formatée
 */
export function formatDate(date) {
  if (!date) return 'NULL';
  if (date instanceof Date) {
    return `'${date.toISOString()}'`;
  }
  return `'${date}'`;
}
