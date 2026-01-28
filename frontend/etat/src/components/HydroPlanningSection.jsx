import { useState, useEffect } from 'react';
import { Droplets, Zap, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { stateService } from '@common/services';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function HydroPlanningSection() {
  const [loading, setLoading] = useState(true);
  const [hydroPlanning, setHydroPlanning] = useState(null);
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000); // Rafraîchir toutes les 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getHydroPlanning();
      setHydroPlanning(data);
      
      // Données de prévision simulées
      setForecastData([
        { jour: 'Lun', niveau: 85, production: 380 },
        { jour: 'Mar', niveau: 83, production: 375 },
        { jour: 'Mer', niveau: 81, production: 370 },
        { jour: 'Jeu', niveau: 79, production: 365 },
        { jour: 'Ven', niveau: 77, production: 360 },
        { jour: 'Sam', niveau: 75, production: 355 },
        { jour: 'Dim', niveau: 73, production: 350 },
      ]);
    } catch (error) {
      console.error('Erreur chargement hydro:', error);
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

  const getNiveauColor = (niveau) => {
    if (niveau >= 80) return 'text-success-600 dark:text-success-400';
    if (niveau >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getNiveauStatus = (niveau) => {
    if (niveau >= 80) return 'Optimal';
    if (niveau >= 60) return 'Acceptable';
    return 'Critique';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Planification Hydroélectrique
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Observatoire des barrages et optimisation de la production
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Production Totale</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {hydroPlanning?.totalHydroProduction?.toFixed(0) || 0} MW
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Actuellement en production
              </p>
            </div>
            <Zap className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Économie Estimée</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {hydroPlanning?.impactCout?.economieEstimee 
                  ? new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(hydroPlanning.impactCout.economieEstimee)
                  : '0'} GNF
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs production thermique
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Barrages Actifs</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {hydroPlanning?.barrages?.length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                En exploitation
              </p>
            </div>
            <Droplets className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Liste des barrages */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          État des Barrages
        </h3>
        <div className="space-y-4">
          {hydroPlanning?.barrages?.map((barrage) => {
            const niveauColor = getNiveauColor(barrage.niveau);
            const status = getNiveauStatus(barrage.niveau);
            const isLow = barrage.niveau < 60;
            
            return (
              <div
                key={barrage.nom}
                className={`p-4 rounded-xl border-l-4 ${
                  isLow 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                    : 'bg-gray-50 dark:bg-gray-700/50 border-primary-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {barrage.nom}
                      </h4>
                      {isLow && (
                        <span className="badge badge-danger">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Alerte
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Niveau</p>
                        <p className={`font-bold text-lg ${niveauColor}`}>
                          {barrage.niveau.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">{status}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Production</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {barrage.productionActuelle.toFixed(0)} / {barrage.capaciteMax} MW
                        </p>
                        <p className="text-xs text-gray-500">
                          {((barrage.productionActuelle / barrage.capaciteMax) * 100).toFixed(0)}% capacité
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Coût Production</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {barrage.coutProduction} GNF/kWh
                        </p>
                        <p className="text-xs text-success-600">
                          -{(700 - barrage.coutProduction)} vs thermique
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Économie</p>
                        <p className="font-bold text-success-600 dark:text-success-400">
                          {((700 - barrage.coutProduction) * barrage.productionActuelle * 24).toLocaleString('fr-FR')} GNF/jour
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Barre de progression niveau */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Niveau du réservoir</span>
                    <span>{barrage.niveau.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isLow 
                          ? 'bg-red-500' 
                          : barrage.niveau >= 80 
                            ? 'bg-success-500' 
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(barrage.niveau, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prévisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Prévision Niveaux (7 jours)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="jour" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="niveau" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                name="Niveau (%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Prévision Production (7 jours)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="jour" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="production" fill="#10b981" name="Production (MW)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workflow Prédictif IA */}
      {hydroPlanning?.impactCout?.aiRecommendation && (
        <div className={`card border-l-4 ${
          hydroPlanning.impactCout.canReduceThermal 
            ? 'bg-success-50 dark:bg-success-900/20 border-success-500' 
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
        }`}>
          <div className="flex items-start space-x-3 mb-3">
            <Activity className="w-6 h-6 text-success-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Recommandation IA - Workflow Prédictif
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {hydroPlanning.impactCout.aiRecommendation}
              </p>
              {hydroPlanning.impactCout.canReduceThermal && (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-success-200 dark:border-success-800">
                  <p className="text-xs text-success-700 dark:text-success-400">
                    <strong>Analyse IA:</strong> L'IA analyse les prévisions météo et les niveaux d'eau 
                    pour suggérer au Ministre de réduire la part du thermique dès que l'hydroélectricité 
                    peut prendre le relais, économisant ainsi des milliards de GNF.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Impact et recommandations */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
          Impact & Recommandations
        </h3>
        <div className="space-y-3">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {hydroPlanning?.impactCout?.message || 'Production hydroélectrique optimale'}
          </p>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Maintenir les niveaux de réservoir au-dessus de 70% pour garantir la continuité</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Coordonner avec les prévisions météorologiques pour optimiser les lâchers</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Planifier la maintenance préventive pendant les périodes de faible demande</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HydroPlanningSection;
