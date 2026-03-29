import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import websocketService from './services/websocketService.js';

// Import routes
import authRoutes from './routes/auth-docker.js'; // Version avec docker exec (workaround Windows)
import homesRoutes from './routes/homes-docker.js'; // Version avec docker exec
import energyRoutes from './routes/energy-docker.js'; // Version avec docker exec
import gridRoutes from './routes/grid-docker.js'; // Version avec docker exec
import incidentsRoutes from './routes/incidents-docker.js'; // Version avec docker exec
import stateRoutes from './routes/state-docker.js'; // Version avec docker exec
import familyRoutes from './routes/family-docker.js'; // Version avec docker exec
import transferRoutes from './routes/transfer-docker.js'; // Version avec docker exec
import metersRoutes from './routes/meters-docker.js'; // Version avec docker exec
import economyModeRoutes from './routes/economy-mode-docker.js'; // Mode Économie Intelligent
import deviceSchedulesRoutes from './routes/device-schedules-docker.js'; // Programmation appareils
import broadcastRoutes from './routes/broadcast-docker.js'; // Diffusion messages
import reconciliationRoutes from './routes/reconciliation-docker.js'; // Réconciliation énergétique
import transformersRoutes from './routes/transformers-docker.js'; // Transformateurs & maintenance
import personnelRoutes from './routes/personnel-docker.js'; // Gestion personnel EDG
import tasksRoutes from './routes/tasks-docker.js'; // Gestion tâches assignées
import sigeIdRoutes from './routes/sige-id-docker.js'; // Système ID SIGE
import taskReportsRoutes from './routes/task-reports-docker.js'; // Rapports de tâches
import notificationsRoutes from './routes/notifications-docker.js'; // Notifications temps réel
import etatEdgMessagesRoutes from './routes/etat-edg-messages-docker.js'; // Messagerie ÉTAT-EDG
import billsRoutes from './routes/bills-docker.js'; // Factures EDG et Paiements

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3001', // Frontend Citoyen
    'http://localhost:3002', // Frontend EDG
    'http://localhost:3003', // Frontend État
    'http://localhost:3004', // Frontend État (port alternatif)
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés (photos d'incidents)
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Tester la connexion via docker exec
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('docker exec sige-postgres psql -U postgres -d sige_guinee -c "SELECT 1"');
    
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Route de test pour vérifier le seed
app.get('/api/test/seed', async (req, res) => {
  try {
    const { countSQL } = await import('./services/sqlService.js');
    
    const userCount = await countSQL('SELECT COUNT(*) FROM users', []);
    const homeCount = await countSQL('SELECT COUNT(*) FROM homes', []);
    const meterCount = await countSQL('SELECT COUNT(*) FROM meters', []);
    const energyDataCount = await countSQL('SELECT COUNT(*) FROM energy_data', []);

    res.json({
      users: userCount,
      homes: homeCount,
      meters: meterCount,
      energyData: energyDataCount,
      message: 'Base de données initialisée avec succès'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de documentation des APIs (publique)
app.get('/api/routes', (req, res) => {
  res.json({
    message: 'Documentation des routes API SIGE-Guinée',
    note: 'La plupart des routes nécessitent une authentification JWT',
    howToAuth: {
      step1: 'POST /api/auth/login avec { email, password }',
      step2: 'Récupérer le token dans la réponse',
      step3: 'Ajouter le header: Authorization: Bearer <token>',
    },
    publicRoutes: {
      health: 'GET /api/health - Vérifier que le serveur fonctionne',
      login: 'POST /api/auth/login - Se connecter',
      register: 'POST /api/auth/register - S\'inscrire',
      routes: 'GET /api/routes - Cette page (documentation)',
    },
    protectedRoutes: {
      broadcast: {
        base: '/api/broadcast',
        routes: [
          'GET /zones - Liste des zones pour diffusion',
          'GET /clients?search=... - Recherche clients',
          'POST /send - Envoyer un message',
          'GET /history - Historique des messages',
          'GET /templates - Modèles de messages',
          'DELETE /:id - Annuler un message programmé',
        ],
        requiredRole: 'AGENT_EDG ou ADMIN_ETAT',
      },
      reconciliation: {
        base: '/api/reconciliation',
        routes: [
          'GET /zones - Données de réconciliation par zone',
          'POST /run - Lancer un calcul complet',
          'POST /ticket - Créer un ticket d\'audit',
          'GET /tickets - Liste des tickets',
          'PUT /tickets/:id - Mettre à jour un ticket',
        ],
        requiredRole: 'AGENT_EDG ou ADMIN_ETAT',
      },
      transformers: {
        base: '/api/transformers',
        routes: [
          'GET / - Liste tous les transformateurs',
          'GET /:id - Détails d\'un transformateur',
          'POST /:id/maintenance - Planifier maintenance',
          'GET /stats/summary - Statistiques globales',
        ],
        requiredRole: 'AGENT_EDG ou ADMIN_ETAT',
      },
      grid: {
        base: '/api/grid',
        routes: [
          'GET /zones - Liste des zones',
          'GET /transformers - Transformateurs avec charge',
          'POST /load-shedding - Délestage intelligent',
          'GET /mqtt-log - Journal des commandes MQTT',
        ],
        requiredRole: 'AGENT_EDG ou ADMIN_ETAT',
      },
    },
    testScript: {
      description: 'Utilisez le script de test automatique',
      command: 'node test-edg-apis.js',
      location: 'backend/test-edg-apis.js',
    },
    quickTest: {
      description: 'Test rapide depuis le navigateur (après connexion)',
      code: `
// Dans la console du navigateur (F12)
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/broadcast/zones', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(r => r.json())
.then(console.log);
      `,
    },
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/homes', homesRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/meters', metersRoutes);
app.use('/api/economy-mode', economyModeRoutes);
app.use('/api/schedules', deviceSchedulesRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/transformers', transformersRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/task-reports', taskReportsRoutes);
app.use('/api/sige-id', sigeIdRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/etat-edg-messages', etatEdgMessagesRoutes);
app.use('/api/bills', billsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Créer le serveur HTTP pour Express et WebSocket
const server = createServer(app);

// Initialiser WebSocket
websocketService.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 Serveur SIGE-Guinée démarré sur le port ${PORT}`);
  console.log(`📊 Base de données: ${process.env.DATABASE_URL?.split('@')[1] || 'non configurée'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
