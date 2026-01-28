import express from 'express';
import { query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, formatDate } from '../services/sqlService.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/sige-id/search/:sigeId
 * Rechercher un client par son ID SIGE (AGENT_EDG uniquement)
 */
router.get('/search/:sigeId', async (req, res) => {
  try {
    const { sigeId } = req.params;
    
    // Vérifier le format de l'ID SIGE
    if (!/^GUI-[A-Z]{3}-\d{5}$/.test(sigeId)) {
      return res.status(400).json({ 
        error: 'Format ID SIGE invalide. Format attendu: GUI-ZONE-NUMERO (ex: GUI-DIX-00123)' 
      });
    }
    
    // Rechercher le client avec toutes ses informations
    const clients = await querySQLObjects(
      `SELECT 
        u.id as user_id,
        u.sige_id,
        u.nom,
        u.email,
        u.telephone,
        u.created_at as inscription_date,
        COUNT(DISTINCT h.id) as nombre_foyers,
        COUNT(DISTINCT m.id) as nombre_compteurs,
        COUNT(DISTINCT i.id) as nombre_incidents,
        MAX(ed.timestamp) as derniere_consommation,
        SUM(ed.power) as consommation_totale_kwh
       FROM users u
       LEFT JOIN homes h ON h.proprietaire_id = u.id
       LEFT JOIN meters m ON m.home_id = h.id
       LEFT JOIN incidents i ON i.reporter_id = u.id
       LEFT JOIN energy_data ed ON ed.meter_id = m.id
       WHERE u.sige_id = $1 AND u.role = 'CITOYEN'
       GROUP BY u.id, u.sige_id, u.nom, u.email, u.telephone, u.created_at`,
      [sigeId],
      [
        'user_id', 'sige_id', 'nom', 'email', 'telephone', 'inscription_date',
        'nombre_foyers', 'nombre_compteurs', 'nombre_incidents',
        'derniere_consommation', 'consommation_totale_kwh'
      ]
    );
    
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé avec cet ID SIGE' });
    }
    
    const client = clients[0];
    
    // Récupérer les foyers du client
    const homes = await querySQLObjects(
      `SELECT h.id, h.nom, h.ville, h.latitude, h.longitude, h.type,
              COUNT(DISTINCT m.id) as nombre_compteurs,
              MAX(m.status) as statut_compteur
       FROM homes h
       LEFT JOIN meters m ON m.home_id = h.id
       WHERE h.proprietaire_id = $1
       GROUP BY h.id, h.nom, h.ville, h.latitude, h.longitude, h.type`,
      [client.user_id],
      ['id', 'nom', 'ville', 'latitude', 'longitude', 'type', 'nombre_compteurs', 'statut_compteur']
    );
    
    // Récupérer les incidents récents
    const incidents = await querySQLObjects(
      `SELECT id, description, status, incident_type, created_at, latitude, longitude
       FROM incidents
       WHERE reporter_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [client.user_id],
      ['id', 'description', 'status', 'incident_type', 'created_at', 'latitude', 'longitude']
    );
    
    // Récupérer la consommation récente (30 derniers jours)
    const recentConsumption = await querySQLObjects(
      `SELECT DATE(ed.timestamp) as date, SUM(ed.power) as consommation_kwh
       FROM energy_data ed
       JOIN meters m ON m.id = ed.meter_id
       JOIN homes h ON h.id = m.home_id
       WHERE h.proprietaire_id = $1
       AND ed.timestamp >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(ed.timestamp)
       ORDER BY date DESC`,
      [client.user_id],
      ['date', 'consommation_kwh']
    );
    
    res.json({
      client: {
        id: client.user_id,
        sigeId: client.sige_id,
        nom: client.nom,
        email: client.email,
        telephone: client.telephone,
        inscriptionDate: client.inscription_date,
        stats: {
          nombreFoyers: parseInt(client.nombre_foyers) || 0,
          nombreCompteurs: parseInt(client.nombre_compteurs) || 0,
          nombreIncidents: parseInt(client.nombre_incidents) || 0,
          derniereConsommation: client.derniere_consommation,
          consommationTotaleKwh: parseFloat(client.consommation_totale_kwh) || 0,
        },
        foyers: homes.map(h => ({
          id: h.id,
          nom: h.nom,
          ville: h.ville,
          type: h.type,
          location: h.latitude ? {
            lat: parseFloat(h.latitude),
            lng: parseFloat(h.longitude),
          } : null,
          nombreCompteurs: parseInt(h.nombre_compteurs) || 0,
          statutCompteur: h.statut_compteur || 'OFFLINE',
        })),
        incidentsRecents: incidents.map(i => ({
          id: i.id,
          description: i.description,
          status: i.status,
          type: i.incident_type,
          createdAt: i.created_at,
          location: i.latitude ? {
            lat: parseFloat(i.latitude),
            lng: parseFloat(i.longitude),
          } : null,
        })),
        consommationRecente: recentConsumption.map(c => ({
          date: c.date,
          consommationKwh: parseFloat(c.consommation_kwh) || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur recherche ID SIGE:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

/**
 * GET /api/sige-id/generate/:userId
 * Générer manuellement un ID SIGE pour un utilisateur (ADMIN uniquement)
 */
router.get('/generate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur existe et est un citoyen
    const users = await querySQLObjects(
      'SELECT id, nom, role, sige_id FROM users WHERE id = $1',
      [userId],
      ['id', 'nom', 'role', 'sige_id']
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const user = users[0];
    
    if (user.role !== 'CITOYEN') {
      return res.status(400).json({ error: 'Les IDs SIGE sont uniquement pour les citoyens' });
    }
    
    if (user.sige_id) {
      return res.status(400).json({ 
        error: 'Cet utilisateur a déjà un ID SIGE',
        sigeId: user.sige_id
      });
    }
    
    // Récupérer la ville depuis le premier foyer
    const homes = await querySQLObjects(
      'SELECT ville FROM homes WHERE proprietaire_id = $1 LIMIT 1',
      [userId],
      ['ville']
    );
    
    const city = homes[0]?.ville || 'Conakry';
    
    // Générer l'ID SIGE via la fonction PostgreSQL
    const result = await executeSQL(
      `SELECT generate_sige_id($1, $2) as sige_id`,
      [userId, city]
    );
    
    // Récupérer l'ID généré
    const updatedUsers = await querySQLObjects(
      'SELECT sige_id FROM users WHERE id = $1',
      [userId],
      ['sige_id']
    );
    
    res.json({
      message: 'ID SIGE généré avec succès',
      sigeId: updatedUsers[0].sige_id,
      client: {
        id: userId,
        nom: user.nom,
      },
    });
  } catch (error) {
    console.error('Erreur génération ID SIGE:', error);
    res.status(500).json({ error: 'Erreur lors de la génération' });
  }
});

/**
 * GET /api/sige-id/stats
 * Statistiques sur les IDs SIGE (ADMIN uniquement)
 */
router.get('/stats', async (req, res) => {
  try {
    // Statistiques par zone
    const zoneStats = await querySQLObjects(
      `SELECT 
        zone_code,
        last_number as dernier_numero,
        updated_at
       FROM sige_id_counters
       ORDER BY zone_code`,
      [],
      ['zone_code', 'dernier_numero', 'updated_at']
    );
    
    // Nombre total de clients avec ID SIGE
    const totalClients = await querySQLObjects(
      `SELECT COUNT(*) as total FROM users WHERE role = 'CITOYEN' AND sige_id IS NOT NULL`,
      [],
      ['total']
    );
    
    // Nombre de clients sans ID SIGE
    const clientsWithoutId = await querySQLObjects(
      `SELECT COUNT(*) as total FROM users WHERE role = 'CITOYEN' AND sige_id IS NULL`,
      [],
      ['total']
    );
    
    res.json({
      stats: {
        totalClientsAvecId: parseInt(totalClients[0]?.total) || 0,
        totalClientsSansId: parseInt(clientsWithoutId[0]?.total) || 0,
        zones: zoneStats.map(z => ({
          code: z.zone_code,
          dernierNumero: parseInt(z.dernier_numero) || 0,
          updatedAt: z.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur statistiques ID SIGE:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
