import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent une authentification et le rôle ADMIN_ETAT
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN_ETAT'));

/**
 * GET /api/state/national-stats
 * Statistiques nationales agrégées
 */
router.get('/national-stats', async (req, res) => {
  try {
    // Statistiques globales
    const totalHomes = await prisma.home.count();
    const homesEDG = await prisma.home.count({ where: { type: 'EDG' } });
    const homesSolaire = await prisma.home.count({ where: { type: 'SOLAIRE' } });
    const homesHybride = await prisma.home.count({ where: { type: 'HYBRIDE' } });

    const totalMeters = await prisma.meter.count();
    const metersOnline = await prisma.meter.count({ where: { status: 'ONLINE' } });

    const totalFinancial = await prisma.financial.aggregate({
      _sum: { balance: true },
    });

    const openIncidents = await prisma.incident.count({ where: { status: 'OPEN' } });
    const fraudIncidents = await prisma.incident.count({
      where: { incidentType: 'FRAUDE_SUSPECTEE', status: 'OPEN' },
    });

    // Statistiques par ville
    const homesByCity = await prisma.home.groupBy({
      by: ['ville'],
      _count: { id: true },
    });

    res.json({
      overview: {
        totalHomes,
        homesByType: {
          EDG: homesEDG,
          SOLAIRE: homesSolaire,
          HYBRIDE: homesHybride,
        },
        totalMeters,
        metersOnline,
        metersOffline: totalMeters - metersOnline,
        totalBalance: totalFinancial._sum.balance || 0,
        openIncidents,
        fraudIncidents,
      },
      byCity: homesByCity.map((city) => ({
        ville: city.ville,
        homesCount: city._count.id,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération stats nationales:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/state/financial-gap
 * Calcul du gap financier (Facture d'Achat vs Recettes)
 */
router.get('/financial-gap', async (req, res) => {
  try {
    // Calculer les recettes collectées (somme des soldes + budgets)
    const financials = await prisma.financial.findMany({
      select: {
        balance: true,
        monthlyBudget: true,
      },
    });

    const totalRecettes = financials.reduce((sum, f) => {
      return sum + (f.balance || 0) + (f.monthlyBudget || 0);
    }, 0);

    // Simuler la facture d'achat (dans un vrai système, cela viendrait d'une table dédiée)
    // Pour la démo, on calcule basé sur la consommation totale
    const recentEnergyData = await prisma.energyData.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Dernier mois
        },
        energySource: 'GRID',
      },
    });

    // Calculer la consommation totale en kWh (approximation)
    const totalConsumptionKWh = recentEnergyData.reduce((sum, data) => {
      // Convertir W en kWh (puissance * temps en heures / 1000)
      // Pour simplifier, on prend la puissance moyenne
      return sum + ((data.power || 0) * 0.001); // Approximation
    }, 0);

    // Prix moyen par kWh (en GNF) - valeur simulée
    const pricePerKWh = 1000; // 1000 GNF/kWh
    const factureAchat = totalConsumptionKWh * pricePerKWh;

    const deficit = factureAchat - totalRecettes;
    const deficitPercentage = factureAchat > 0 ? (deficit / factureAchat) * 100 : 0;

    res.json({
      factureAchat,
      recettesCollectees: totalRecettes,
      deficit,
      deficitPercentage: Math.abs(deficitPercentage),
      consommationTotaleKWh: totalConsumptionKWh,
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur calcul gap financier:', error);
    res.status(500).json({ error: 'Erreur lors du calcul' });
  }
});

/**
 * GET /api/state/hydro-planning
 * Observatoire des barrages (Souapiti, Kaléta)
 */
router.get('/hydro-planning', async (req, res) => {
  try {
    // Simuler les données des barrages
    // Dans un vrai système, cela viendrait d'une API externe ou d'une table dédiée
    const barrages = [
      {
        nom: 'Souapiti',
        niveau: 85 + Math.random() * 10, // 85-95%
        capaciteMax: 450, // MW
        productionActuelle: 380 + Math.random() * 50,
        coutProduction: 200, // GNF/kWh (hydro moins cher)
      },
      {
        nom: 'Kaléta',
        niveau: 75 + Math.random() * 10, // 75-85%
        capaciteMax: 240, // MW
        productionActuelle: 200 + Math.random() * 30,
        coutProduction: 250, // GNF/kWh
      },
    ];

    // Calculer l'impact sur les coûts
    const totalHydroProduction = barrages.reduce(
      (sum, b) => sum + b.productionActuelle,
      0
    );

    res.json({
      barrages,
      totalHydroProduction,
      impactCout: {
        message: 'Production hydroélectrique réduit le besoin d\'achat thermique',
        economieEstimee: totalHydroProduction * 500, // 500 GNF/kWh économisés vs thermique
      },
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur récupération hydro-planning:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
