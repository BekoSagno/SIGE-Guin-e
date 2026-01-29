import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, countSQL, formatDate } from '../services/sqlService.js';

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN_ETAT'));

/**
 * GET /api/state/national-stats
 * Statistiques nationales agrégées
 */
router.get('/national-stats', async (req, res) => {
  try {
    // Statistiques globales
    const totalHomes = await countSQL('SELECT COUNT(*) FROM homes', []);
    const homesEDG = await countSQL("SELECT COUNT(*) FROM homes WHERE type = 'EDG'", []);
    const homesSolaire = await countSQL("SELECT COUNT(*) FROM homes WHERE type = 'SOLAIRE'", []);
    const homesHybride = await countSQL("SELECT COUNT(*) FROM homes WHERE type = 'HYBRIDE'", []);

    const totalMeters = await countSQL('SELECT COUNT(*) FROM meters', []);
    const metersOnline = await countSQL("SELECT COUNT(*) FROM meters WHERE status = 'ONLINE'", []);

    // Calculer le total des soldes
    const financials = await querySQLObjects(
      'SELECT balance, monthly_budget FROM financials',
      [],
      ['balance', 'monthly_budget']
    );
    const totalBalance = financials.reduce((sum, f) => {
      return sum + (parseFloat(f.balance || 0)) + (parseFloat(f.monthly_budget || 0));
    }, 0);

    const openIncidents = await countSQL("SELECT COUNT(*) FROM incidents WHERE status = 'OPEN'", []);
    const fraudIncidents = await countSQL(
      "SELECT COUNT(*) FROM incidents WHERE incident_type = 'FRAUDE_SUSPECTEE' AND status = 'OPEN'",
      []
    );

    // Statistiques par ville
    const homesByCity = await querySQLObjects(
      'SELECT ville, COUNT(*) as count FROM homes GROUP BY ville',
      [],
      ['ville', 'count']
    );

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
        totalBalance,
        openIncidents,
        fraudIncidents,
      },
      byCity: homesByCity.map((city) => ({
        ville: city.ville,
        homesCount: parseInt(city.count),
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
    const financials = await querySQLObjects(
      'SELECT balance, monthly_budget FROM financials',
      [],
      ['balance', 'monthly_budget']
    );

    const totalRecettes = financials.reduce((sum, f) => {
      return sum + (parseFloat(f.balance || 0)) + (parseFloat(f.monthly_budget || 0));
    }, 0);

    // Récupérer les données énergétiques du dernier mois
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEnergyData = await querySQLObjects(
      `SELECT power FROM energy_data
       WHERE timestamp >= $1 AND energy_source = 'GRID'`,
      [formatDate(oneMonthAgo)],
      ['power']
    );

    // Calculer la consommation totale en kWh (approximation)
    const totalConsumptionKWh = recentEnergyData.reduce((sum, data) => {
      return sum + ((parseFloat(data.power || 0)) * 0.001); // Approximation
    }, 0);

    // Prix moyen par kWh (en GNF) - valeur simulée
    const pricePerKWh = 1000; // 1000 GNF/kWh
    const factureAchat = totalConsumptionKWh * pricePerKWh;

    const deficit = factureAchat - totalRecettes;
    const deficitPercentage = factureAchat > 0 ? (deficit / factureAchat) * 100 : 0;

    // Calculer la souveraineté énergétique (Part Solaire vs Thermique)
    // Récupérer les données hydroélectriques
    let totalHydroMW = 0;
    try {
      const hydroData = await querySQLObjects(
        'SELECT SUM(production_current_mw) as total_hydro FROM hydro_dams',
        [],
        ['total_hydro']
      );
      totalHydroMW = parseFloat(hydroData[0]?.total_hydro || 0);
    } catch (err) {
      console.warn('Table hydro_dams non trouvée, utilisation de données par défaut:', err.message);
      totalHydroMW = 580; // Valeur par défaut
    }

    // Récupérer les données solaires (approximation basée sur les foyers solaires)
    const solarHomes = await countSQL("SELECT COUNT(*) FROM homes WHERE type IN ('SOLAIRE', 'HYBRIDE')", []);
    const estimatedSolarMW = solarHomes * 0.005; // Approximation: 5kW par foyer solaire

    // Calculer la part renouvelable vs importée
    const totalRenewableMW = totalHydroMW + estimatedSolarMW;
    const totalEnergyMW = totalConsumptionKWh / 1000; // Conversion approximative
    const totalImportedMW = totalEnergyMW - totalRenewableMW;

    const renewablePercent = totalEnergyMW > 0 ? (totalRenewableMW / totalEnergyMW) * 100 : 0;
    const importedPercent = 100 - renewablePercent;

    // Calculer la réduction du déficit grâce à la technologie
    const deficitReductionPercent = Math.min(15, renewablePercent * 0.3); // Jusqu'à 15% de réduction

    res.json({
      factureAchat,
      recettesCollectees: totalRecettes,
      deficit,
      deficitPercentage: Math.abs(deficitPercentage),
      consommationTotaleKWh: totalConsumptionKWh,
      sovereigntyData: {
        renewablePercent: renewablePercent,
        importedPercent: importedPercent,
        renewableEnergyMW: totalRenewableMW,
        importedEnergyMW: Math.max(0, totalImportedMW),
        deficitReductionPercent: deficitReductionPercent,
      },
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
    // Récupérer les données des barrages depuis la base de données
    let barragesData = [];
    try {
      barragesData = await querySQLObjects(
        `SELECT name, capacity_max_mw, current_level_percent, production_current_mw, 
                cost_per_kwh, forecast_level_7d, forecast_production_7d, weather_alert
         FROM hydro_dams
         ORDER BY name`,
        [],
        ['name', 'capacity_max_mw', 'current_level_percent', 'production_current_mw', 
         'cost_per_kwh', 'forecast_level_7d', 'forecast_production_7d', 'weather_alert']
      );
    } catch (err) {
      console.warn('Table hydro_dams non trouvée, utilisation de données par défaut:', err.message);
      barragesData = [];
    }

    // Si pas de données, créer des données par défaut
    let barrages = barragesData.length > 0 
      ? barragesData.map(b => ({
          nom: b.name,
          niveau: parseFloat(b.current_level_percent || 80),
          capaciteMax: parseFloat(b.capacity_max_mw || 450),
          productionActuelle: parseFloat(b.production_current_mw || 380),
          coutProduction: parseFloat(b.cost_per_kwh || 200),
          forecastLevel7d: b.forecast_level_7d ? JSON.parse(b.forecast_level_7d) : null,
          forecastProduction7d: b.forecast_production_7d ? JSON.parse(b.forecast_production_7d) : null,
          weatherAlert: b.weather_alert,
        }))
      : [
          {
            nom: 'Souapiti',
            niveau: 85 + Math.random() * 10,
            capaciteMax: 450,
            productionActuelle: 380 + Math.random() * 50,
            coutProduction: 200,
          },
          {
            nom: 'Kaléta',
            niveau: 75 + Math.random() * 10,
            capaciteMax: 240,
            productionActuelle: 200 + Math.random() * 30,
            coutProduction: 250,
          },
        ];

    // Calculer l'impact sur les coûts
    const totalHydroProduction = barrages.reduce(
      (sum, b) => sum + b.productionActuelle,
      0
    );

    // Workflow Prédictif IA: Analyser si on peut réduire le thermique
    const avgLevel = barrages.reduce((sum, b) => sum + b.niveau, 0) / barrages.length;
    const canReduceThermal = avgLevel > 70 && totalHydroProduction > 500;
    const aiRecommendation = canReduceThermal
      ? `Niveaux optimaux détectés. Recommandation: Réduire la production thermique de ${Math.round(totalHydroProduction * 0.1)} MW pour économiser ${Math.round(totalHydroProduction * 0.1 * 500 * 24)} GNF/jour.`
      : 'Maintenir la production thermique. Niveaux des barrages nécessitent une surveillance.';

    res.json({
      barrages,
      totalHydroProduction,
      impactCout: {
        message: 'Production hydroélectrique réduit le besoin d\'achat thermique',
        economieEstimee: totalHydroProduction * 500, // 500 GNF/kWh économisés vs thermique
        aiRecommendation,
        canReduceThermal,
      },
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur récupération hydro-planning:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/state/rural-planning
 * Planification du Ravitaillement National
 */
router.get('/rural-planning', async (req, res) => {
  try {
    // Détection du surplus urbain (énergie économisée via Mode Économie + Lutte Fraude)
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const energySaved = await querySQLObjects(
      `SELECT SUM(power * 0.001) as saved_kwh 
       FROM energy_data 
       WHERE timestamp >= $1 AND energy_source = 'GRID'`,
      [formatDate(oneMonthAgo)],
      ['saved_kwh']
    );
    const surplusMW = parseFloat(energySaved[0]?.saved_kwh || 0) / 1000 * 0.15; // 15% économisé

    // Récupérer les plans d'électrification rurale
    let ruralPlans = [];
    try {
      ruralPlans = await querySQLObjects(
        `SELECT region, village_name, latitude, longitude, population, current_status,
                energy_surplus_allocated_mw, estimated_cost_gnf, target_completion_date,
                electrification_rate_2030
         FROM rural_electrification_plans
         ORDER BY region, village_name`,
        [],
        ['region', 'village_name', 'latitude', 'longitude', 'population', 'current_status',
         'energy_surplus_allocated_mw', 'estimated_cost_gnf', 'target_completion_date',
         'electrification_rate_2030']
      );
    } catch (err) {
      console.warn('Table rural_electrification_plans non trouvée ou vide:', err.message);
      ruralPlans = [];
    }

    // Simulation d'extension: calculer combien de villages peuvent être alimentés
    const villagesCanPower = Math.floor(surplusMW / 0.5); // 0.5 MW par village

    res.json({
      surplusDetected: {
        energySavedMW: surplusMW,
        source: 'Mode Économie + Lutte contre la Fraude (NILM/IoT)',
        message: `En économisant ${surplusMW.toFixed(2)} MW à Conakry via SIGE, nous pouvons alimenter ${villagesCanPower} villages à l'intérieur du pays sans coût de production additionnel.`,
      },
      ruralPlans: ruralPlans.map(p => ({
        region: p.region,
        villageName: p.village_name,
        latitude: parseFloat(p.latitude || 0),
        longitude: parseFloat(p.longitude || 0),
        population: parseInt(p.population || 0),
        status: p.current_status,
        energyAllocatedMW: parseFloat(p.energy_surplus_allocated_mw || 0),
        estimatedCost: parseFloat(p.estimated_cost_gnf || 0),
        targetDate: p.target_completion_date,
        electrificationRate2030: parseFloat(p.electrification_rate_2030 || 0),
      })),
      simulationExtension: {
        villagesCanPower,
        totalCost: villagesCanPower * 50000000, // 50M GNF par village
        energyRequiredMW: villagesCanPower * 0.5,
      },
      objective2030: {
        currentRate: 35.5, // Taux actuel d'électrification
        targetRate: 70.0,
        remaining: 34.5,
      },
    });
  } catch (error) {
    console.error('Erreur récupération rural-planning:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/state/performance-audit
 * Audit de Performance & Anti-Corruption
 */
router.get('/performance-audit', async (req, res) => {
  try {
    // Récupérer le classement des zones par rendement
    let zoneRanking = [];
    try {
      zoneRanking = await querySQLObjects(
        `SELECT zone_name, efficiency_percent, revenue_collected_gnf, 
                energy_injected_kwh, energy_recovered_kwh, alert_level,
                iot_equipment_count, investigation_required
         FROM v_zone_efficiency_ranking
         LIMIT 20`,
        [],
        ['zone_name', 'efficiency_percent', 'revenue_collected_gnf',
         'energy_injected_kwh', 'energy_recovered_kwh', 'alert_level',
         'iot_equipment_count', 'investigation_required']
      );
      
      // Calculer fraud_cases_detected à partir des incidents
      for (const zone of zoneRanking) {
        const fraudCount = await countSQL(
          `SELECT COUNT(*) FROM incidents 
           WHERE incident_type = 'FRAUDE_SUSPECTEE' 
           AND home_id IN (SELECT id FROM homes WHERE ville = $1)`,
          [zone.zone_name]
        );
        zone.fraud_cases_detected = fraudCount;
      }
    } catch (err) {
      console.warn('Vue v_zone_efficiency_ranking non trouvée:', err.message);
      // Données par défaut basées sur les zones existantes
      const zones = await querySQLObjects(
        'SELECT DISTINCT ville FROM homes LIMIT 10',
        [],
        ['ville']
      );
      zoneRanking = zones.map((z, idx) => ({
        zone_name: z.ville,
        efficiency_percent: 75 - idx * 2,
        revenue_collected_gnf: 10000000 - idx * 500000,
        energy_injected_kwh: 50000 - idx * 2000,
        energy_recovered_kwh: 40000 - idx * 1500,
        alert_level: idx < 2 ? 'WARNING' : 'NORMAL',
        fraud_cases_detected: idx < 2 ? 2 : 0,
        iot_equipment_count: 100 - idx * 5,
        investigation_required: idx < 2,
      }));
    }

    // Zones nécessitant une enquête
    const zonesNeedingInvestigation = zoneRanking.filter(
      z => z.alert_level === 'CRITICAL' || z.investigation_required === true
    );

    res.json({
      zoneRanking: zoneRanking.map(z => ({
        zoneName: z.zone_name,
        efficiencyPercent: parseFloat(z.efficiency_percent || 0),
        revenueCollected: parseFloat(z.revenue_collected_gnf || 0),
        energyInjected: parseFloat(z.energy_injected_kwh || 0),
        energyRecovered: parseFloat(z.energy_recovered_kwh || 0),
        alertLevel: z.alert_level,
        fraudCases: parseInt(z.fraud_cases_detected || 0),
        iotEquipment: parseInt(z.iot_equipment_count || 0),
        needsInvestigation: z.investigation_required === true,
      })),
      alerts: {
        criticalZones: zonesNeedingInvestigation.length,
        totalZones: zoneRanking.length,
        avgEfficiency: zoneRanking.length > 0
          ? zoneRanking.reduce((sum, z) => sum + parseFloat(z.efficiency_percent || 0), 0) / zoneRanking.length
          : 0,
      },
      transparency: {
        dataCertified: true,
        blockchainEnabled: false, // À activer en production
        logsImmutable: true,
      },
    });
  } catch (error) {
    console.error('Erreur récupération performance-audit:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/state/social-impact
 * Analyse d'Impact Social
 */
router.get('/social-impact', async (req, res) => {
  try {
    // Récupérer les métriques d'impact social
    let socialMetrics = [];
    try {
      socialMetrics = await querySQLObjects(
        `SELECT metric_date, region, hospital_count, hospitals_with_power,
                school_count, schools_with_power, total_families_savings_gnf,
                families_benefiting_count, avg_savings_per_family_gnf
         FROM social_impact_metrics
         WHERE metric_date >= CURRENT_DATE - INTERVAL '1 month'
         ORDER BY metric_date DESC
         LIMIT 10`,
        [],
        ['metric_date', 'region', 'hospital_count', 'hospitals_with_power',
         'school_count', 'schools_with_power', 'total_families_savings_gnf',
         'families_benefiting_count', 'avg_savings_per_family_gnf']
      );
    } catch (err) {
      console.warn('Table social_impact_metrics non trouvée:', err.message);
      socialMetrics = [];
    }

    // Calculer les totaux nationaux
    const totals = socialMetrics.reduce((acc, m) => ({
      hospitals: acc.hospitals + parseInt(m.hospital_count || 0),
      hospitalsWithPower: acc.hospitalsWithPower + parseInt(m.hospitals_with_power || 0),
      schools: acc.schools + parseInt(m.school_count || 0),
      schoolsWithPower: acc.schoolsWithPower + parseInt(m.schools_with_power || 0),
      totalSavings: acc.totalSavings + parseFloat(m.total_families_savings_gnf || 0),
      familiesBenefiting: acc.familiesBenefiting + parseInt(m.families_benefiting_count || 0),
    }), { hospitals: 0, hospitalsWithPower: 0, schools: 0, schoolsWithPower: 0, totalSavings: 0, familiesBenefiting: 0 });

    res.json({
      ravitaillementVital: {
        hospitals: {
          total: totals.hospitals,
          withPower: totals.hospitalsWithPower,
          coveragePercent: totals.hospitals > 0 
            ? (totals.hospitalsWithPower / totals.hospitals) * 100 
            : 0,
        },
        schools: {
          total: totals.schools,
          withPower: totals.schoolsWithPower,
          coveragePercent: totals.schools > 0 
            ? (totals.schoolsWithPower / totals.schools) * 100 
            : 0,
        },
      },
      pouvoirAchat: {
        totalSavingsGNF: totals.totalSavings,
        familiesBenefiting: totals.familiesBenefiting,
        avgSavingsPerFamily: totals.familiesBenefiting > 0
          ? totals.totalSavings / totals.familiesBenefiting
          : 0,
        message: `Cumul national de ${new Intl.NumberFormat('fr-FR').format(totals.totalSavings)} GNF économisés par les familles grâce au Mode Économie.`,
      },
      metricsByRegion: socialMetrics.map(m => ({
        date: m.metric_date,
        region: m.region,
        hospitals: {
          total: parseInt(m.hospital_count || 0),
          withPower: parseInt(m.hospitals_with_power || 0),
        },
        schools: {
          total: parseInt(m.school_count || 0),
          withPower: parseInt(m.schools_with_power || 0),
        },
        savings: {
          total: parseFloat(m.total_families_savings_gnf || 0),
          families: parseInt(m.families_benefiting_count || 0),
          avg: parseFloat(m.avg_savings_per_family_gnf || 0),
        },
      })),
    });
  } catch (error) {
    console.error('Erreur récupération social-impact:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/state/maintenance-predictive
 * Maintenance Prédictive Nationale (Réseau HT)
 */
router.get('/maintenance-predictive', async (req, res) => {
  try {
    // Récupérer les données de maintenance prédictive
    let maintenanceData = [];
    try {
      maintenanceData = await querySQLObjects(
        `SELECT line_name, region, voltage_level_kv, voltage_drop_percent,
                current_load_percent, predicted_failure_risk, failure_probability_percent,
                predicted_failure_date, maintenance_priority, maintenance_cost_estimated_gnf,
                maintenance_scheduled_date, weather_impact_factor, age_years
         FROM network_maintenance_ht
         ORDER BY 
           CASE maintenance_priority
             WHEN 'NATIONAL_PRIORITY' THEN 1
             WHEN 'URGENT' THEN 2
             WHEN 'HIGH' THEN 3
             ELSE 4
           END,
           predicted_failure_risk DESC`,
        [],
        ['line_name', 'region', 'voltage_level_kv', 'voltage_drop_percent',
         'current_load_percent', 'predicted_failure_risk', 'failure_probability_percent',
         'predicted_failure_date', 'maintenance_priority', 'maintenance_cost_estimated_gnf',
         'maintenance_scheduled_date', 'weather_impact_factor', 'age_years']
      );
    } catch (err) {
      console.warn('Table network_maintenance_ht non trouvée:', err.message);
      maintenanceData = [];
    }

    // Récupérer les alertes de black-out national
    let blackoutAlerts = [];
    try {
      blackoutAlerts = await querySQLObjects(
        `SELECT alert_level, affected_lines, estimated_impact_population,
                estimated_impact_regions, estimated_duration_hours,
                emergency_funds_required_gnf, funds_approved, mitigation_actions, resolved
         FROM national_blackout_alerts
         WHERE resolved = false
         ORDER BY 
           CASE alert_level
             WHEN 'IMMINENT' THEN 1
             WHEN 'CRITICAL' THEN 2
             WHEN 'WARNING' THEN 3
           END
         LIMIT 10`,
        [],
        ['alert_level', 'affected_lines', 'estimated_impact_population',
         'estimated_impact_regions', 'estimated_duration_hours',
         'emergency_funds_required_gnf', 'funds_approved', 'mitigation_actions', 'resolved']
      );
    } catch (err) {
      console.warn('Table national_blackout_alerts non trouvée:', err.message);
      blackoutAlerts = [];
    }

    // Analyser les risques
    const criticalLines = maintenanceData.filter(
      l => l.predicted_failure_risk === 'CRITICAL' || l.predicted_failure_risk === 'HIGH'
    );

    res.json({
      networkLines: maintenanceData.map(l => ({
        lineName: l.line_name,
        region: l.region,
        voltageLevel: parseInt(l.voltage_level_kv || 0),
        voltageDrop: parseFloat(l.voltage_drop_percent || 0),
        currentLoad: parseFloat(l.current_load_percent || 0),
        failureRisk: l.predicted_failure_risk,
        failureProbability: parseFloat(l.failure_probability_percent || 0),
        predictedFailureDate: l.predicted_failure_date,
        priority: l.maintenance_priority,
        estimatedCost: parseFloat(l.maintenance_cost_estimated_gnf || 0),
        scheduledDate: l.maintenance_scheduled_date,
        weatherImpact: parseFloat(l.weather_impact_factor || 0),
        age: parseInt(l.age_years || 0),
      })),
      riskAnalysis: {
        criticalLines: criticalLines.length,
        totalLines: maintenanceData.length,
        totalEstimatedCost: maintenanceData.reduce(
          (sum, l) => sum + parseFloat(l.maintenance_cost_estimated_gnf || 0),
          0
        ),
        avgFailureProbability: maintenanceData.length > 0
          ? maintenanceData.reduce(
              (sum, l) => sum + parseFloat(l.failure_probability_percent || 0),
              0
            ) / maintenanceData.length
          : 0,
      },
      blackoutAlerts: blackoutAlerts.map(a => ({
        level: a.alert_level,
        affectedLines: Array.isArray(a.affected_lines) ? a.affected_lines : [],
        impactPopulation: parseInt(a.estimated_impact_population || 0),
        impactRegions: Array.isArray(a.estimated_impact_regions) ? a.estimated_impact_regions : [],
        estimatedDuration: parseFloat(a.estimated_duration_hours || 0),
        fundsRequired: parseFloat(a.emergency_funds_required_gnf || 0),
        fundsApproved: a.funds_approved === true,
        mitigationActions: a.mitigation_actions,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération maintenance-predictive:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
