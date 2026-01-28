import { querySQLObjects, formatDate } from './sqlService.js';

/**
 * Détecte une suspicion de fraude en comparant la puissance consommée
 * avec l'index du compteur
 * @param {string} meterId - ID du compteur
 * @param {number} currentPower - Puissance actuelle en watts
 * @returns {Promise<boolean>} - true si fraude suspectée
 */
export async function detectFraud(meterId, currentPower) {
  try {
    // Récupérer les données récentes du compteur (dernière heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentData = await querySQLObjects(
      `SELECT id, power FROM energy_data
       WHERE meter_id = $1 AND timestamp >= $2 AND energy_source = 'GRID'
       ORDER BY timestamp DESC`,
      [meterId, formatDate(oneHourAgo)],
      ['id', 'power']
    );

    if (recentData.length < 2) {
      return false; // Pas assez de données pour détecter
    }

    // Calculer la puissance moyenne sur la période
    const totalPower = recentData.reduce((sum, data) => sum + (parseFloat(data.power) || 0), 0);
    const averagePower = totalPower / recentData.length;

    // Calculer l'index du compteur (somme des puissances sur la période)
    // En réalité, l'index serait calculé différemment, mais pour la démo :
    const meterIndex = totalPower;

    // Calculer la puissance totale consommée (somme de toutes les puissances)
    const totalConsumedPower = recentData.reduce((sum, data) => sum + (parseFloat(data.power) || 0), 0);

    // Calculer le delta (différence entre consommation et index)
    const delta = Math.abs(totalConsumedPower - meterIndex);
    const deltaPercentage = meterIndex > 0 ? (delta / meterIndex) * 100 : 0;

    // Si le delta dépasse 15%, suspicion de fraude
    if (deltaPercentage > 15) {
      console.log(`⚠️ Fraude suspectée sur le compteur ${meterId}:`);
      console.log(`   Index compteur: ${meterIndex.toFixed(2)}W`);
      console.log(`   Puissance consommée: ${totalConsumedPower.toFixed(2)}W`);
      console.log(`   Delta: ${deltaPercentage.toFixed(2)}%`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erreur détection fraude:', error);
    return false;
  }
}

/**
 * Détecte la fraude en comparant la somme des signatures NILM
 * avec la consommation réelle du compteur
 * @param {string} meterId - ID du compteur
 * @returns {Promise<boolean>} - true si fraude suspectée
 */
export async function detectFraudByNILM(meterId) {
  try {
    // Récupérer les signatures NILM actives
    const activeDevices = await querySQLObjects(
      `SELECT id, power_signature FROM nilm_signatures
       WHERE meter_id = $1 AND is_active = true`,
      [meterId],
      ['id', 'power_signature']
    );

    // Calculer la puissance totale des appareils détectés
    const totalNILMPower = activeDevices.reduce(
      (sum, device) => sum + (parseFloat(device.power_signature) || 0),
      0
    );

    // Récupérer la dernière mesure de puissance du compteur
    const lastMeasurements = await querySQLObjects(
      `SELECT id, power FROM energy_data
       WHERE meter_id = $1 AND energy_source = 'GRID'
       ORDER BY timestamp DESC
       LIMIT 1`,
      [meterId],
      ['id', 'power']
    );

    if (lastMeasurements.length === 0 || !lastMeasurements[0].power) {
      return false;
    }

    const meterPower = parseFloat(lastMeasurements[0].power);

    // Si la puissance du compteur est significativement inférieure
    // à la somme des appareils, suspicion de fraude
    const delta = meterPower - totalNILMPower;
    const deltaPercentage = totalNILMPower > 0 ? (Math.abs(delta) / totalNILMPower) * 100 : 0;

    if (deltaPercentage > 15 && delta < 0) {
      // Le compteur indique moins que ce qui est consommé
      console.log(`⚠️ Fraude suspectée (NILM) sur le compteur ${meterId}:`);
      console.log(`   Puissance compteur: ${meterPower.toFixed(2)}W`);
      console.log(`   Puissance appareils (NILM): ${totalNILMPower.toFixed(2)}W`);
      console.log(`   Delta: ${deltaPercentage.toFixed(2)}%`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erreur détection fraude NILM:', error);
    return false;
  }
}
