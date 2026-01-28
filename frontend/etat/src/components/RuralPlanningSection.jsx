import { useState, useEffect } from 'react';
import { Home, MapPin, Zap, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { stateService } from '@common/services';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function RuralPlanningSection() {
  const [loading, setLoading] = useState(true);
  const [ruralData, setRuralData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getRuralPlanning();
      setRuralData(data);
    } catch (error) {
      console.error('Erreur chargement rural-planning:', error);
      // Données par défaut en cas d'erreur
      setRuralData({
        surplusDetected: {
          energySavedMW: 0,
          source: 'Mode Économie + Lutte contre la Fraude (NILM/IoT)',
          message: 'Aucun surplus détecté pour le moment.',
        },
        ruralPlans: [],
        simulationExtension: {
          villagesCanPower: 0,
          totalCost: 0,
          energyRequiredMW: 0,
        },
        objective2030: {
          currentRate: 35.5,
          targetRate: 70.0,
          remaining: 34.5,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  // Palette de couleurs simplifiée et professionnelle - primary, success, gray
  const COLORS = ['#0ea5e9', '#10b981', '#6b7280', '#0ea5e9'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Planification du Ravitaillement National
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Détection du surplus urbain et extension de l'électrification rurale
        </p>
      </div>

      {/* Détection du Surplus */}
      {ruralData?.surplusDetected && (
        <div className="card border-l-4 border-success-500 bg-gray-50 dark:bg-gray-700/30 hover:shadow-xl transition-all duration-300 animate-fade-in-scale">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Surplus Détecté
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {ruralData.surplusDetected.source}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-success-600 dark:text-success-400">
                {ruralData.surplusDetected.energySavedMW.toFixed(2)} MW
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Énergie économisée</p>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {ruralData.surplusDetected.message}
            </p>
          </div>
        </div>
      )}

      {/* Simulation d'Extension */}
      {ruralData?.simulationExtension && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card border-l-4 border-primary-500">
            <div className="flex items-center space-x-3 mb-3">
              <Home className="w-6 h-6 text-primary-600" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Villages Alimentables
              </h3>
            </div>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {ruralData.simulationExtension.villagesCanPower}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Avec le surplus détecté
            </p>
          </div>

          <div className="card border-l-4 border-amber-500">
            <div className="flex items-center space-x-3 mb-3">
              <Zap className="w-6 h-6 text-amber-600" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Énergie Requise
              </h3>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {ruralData.simulationExtension.energyRequiredMW.toFixed(2)} MW
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Pour l'extension rurale
            </p>
          </div>

          <div className="card border-l-4 border-success-500">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-6 h-6 text-success-600" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Coût Estimé
              </h3>
            </div>
            <p className="text-3xl font-bold text-success-600 dark:text-success-400">
              {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                ruralData.simulationExtension.totalCost
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              GNF total
            </p>
          </div>
        </div>
      )}

      {/* Objectif 2030 */}
      {ruralData?.objective2030 && (
        <div className="card border-l-4 border-primary-500 bg-gray-50 dark:bg-gray-700/30 hover:shadow-xl transition-all duration-300 animate-slide-up">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Objectif Électrification 2030
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taux Actuel</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {ruralData.objective2030.currentRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Objectif 2030</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {ruralData.objective2030.targetRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reste à Faire</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {ruralData.objective2030.remaining}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-primary-500 h-4 transition-all duration-500"
                style={{ width: `${ruralData.objective2030.currentRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              Progression vers l'objectif 2030
            </p>
          </div>
        </div>
      )}

      {/* Plans d'Électrification Rurale */}
      {ruralData?.ruralPlans && ruralData.ruralPlans.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Plans d'Électrification par Région
          </h3>
          <div className="space-y-4">
            {ruralData.ruralPlans.map((plan, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-l-4 ${
                  plan.status === 'ELECTRIFIE'
                    ? 'bg-success-50 dark:bg-success-900/20 border-success-500'
                    : plan.status === 'EN_CONSTRUCTION'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                    : plan.status === 'EN_PLANIFICATION'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {plan.villageName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.region} • {plan.population.toLocaleString()} habitants
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      plan.status === 'ELECTRIFIE'
                        ? 'badge-success'
                        : plan.status === 'EN_CONSTRUCTION'
                        ? 'badge-warning'
                        : plan.status === 'EN_PLANIFICATION'
                        ? 'badge-info'
                        : 'badge-secondary'
                    }`}
                  >
                    {plan.status === 'ELECTRIFIE'
                      ? 'Électrifié'
                      : plan.status === 'EN_CONSTRUCTION'
                      ? 'En Construction'
                      : plan.status === 'EN_PLANIFICATION'
                      ? 'En Planification'
                      : 'Non Électrifié'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Énergie Allouée</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {plan.energyAllocatedMW.toFixed(2)} MW
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Coût Estimé</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                        plan.estimatedCost
                      )}{' '}
                      GNF
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Date Cible</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {plan.targetDate
                        ? new Date(plan.targetDate).toLocaleDateString('fr-FR')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Taux 2030</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {plan.electrificationRate2030.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graphique de répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Répartition par Statut
          </h3>
          {ruralData?.ruralPlans && ruralData.ruralPlans.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Électrifié',
                      value: ruralData.ruralPlans.filter((p) => p.status === 'ELECTRIFIE').length,
                    },
                    {
                      name: 'En Construction',
                      value: ruralData.ruralPlans.filter((p) => p.status === 'EN_CONSTRUCTION')
                        .length,
                    },
                    {
                      name: 'En Planification',
                      value: ruralData.ruralPlans.filter((p) => p.status === 'EN_PLANIFICATION')
                        .length,
                    },
                    {
                      name: 'Non Électrifié',
                      value: ruralData.ruralPlans.filter((p) => p.status === 'NON_ELECTRIFIE')
                        .length,
                    },
                  ].filter((item) => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Électrifié', value: 0 },
                    { name: 'En Construction', value: 0 },
                    { name: 'En Planification', value: 0 },
                    { name: 'Non Électrifié', value: 0 },
                  ]
                    .filter((_, idx) => {
                      const statuses = ['ELECTRIFIE', 'EN_CONSTRUCTION', 'EN_PLANIFICATION', 'NON_ELECTRIFIE'];
                      return ruralData.ruralPlans.some((p) => p.status === statuses[idx]);
                    })
                    .map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Répartition par Région
          </h3>
          {ruralData?.ruralPlans && ruralData.ruralPlans.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={Object.entries(
                  ruralData.ruralPlans.reduce((acc, plan) => {
                    acc[plan.region] = (acc[plan.region] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([region, count]) => ({ region, count }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="region" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#0ea5e9" name="Nombre de villages" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RuralPlanningSection;
