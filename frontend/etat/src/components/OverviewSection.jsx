import { useState, useEffect } from 'react';
import { Shield, TrendingUp, TrendingDown, MapPin, Zap, Users, Building2, Activity } from 'lucide-react';
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
  LineChart,
  Line,
} from 'recharts';

function OverviewSection() {
  const [loading, setLoading] = useState(true);
  const [nationalStats, setNationalStats] = useState(null);
  const [financialGap, setFinancialGap] = useState(null);
  const [hydroPlanning, setHydroPlanning] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Rafraîchir toutes les minutes
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [stats, gap, hydro] = await Promise.all([
        stateService.getNationalStats(),
        stateService.getFinancialGap(),
        stateService.getHydroPlanning(),
      ]);
      
      setNationalStats(stats);
      setFinancialGap(gap);
      setHydroPlanning(hydro);
    } catch (error) {
      console.error('Erreur chargement données:', error);
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

  const homesByTypeData = nationalStats?.overview?.homesByType
    ? [
        { name: 'EDG', value: nationalStats.overview.homesByType.EDG },
        { name: 'Solaire', value: nationalStats.overview.homesByType.SOLAIRE },
        { name: 'Hybride', value: nationalStats.overview.homesByType.HYBRIDE },
      ]
    : [];

  const citiesData = nationalStats?.byCity || [];
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Vue d'Ensemble Nationale
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Tableau de bord stratégique et macro-économique
        </p>
      </div>

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Foyers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {nationalStats?.overview?.totalHomes?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Connectés au réseau
              </p>
            </div>
            <Shield className="w-12 h-12 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-success-200 dark:border-success-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Compteurs Actifs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {nationalStats?.overview?.metersOnline?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {nationalStats?.overview?.totalMeters ? 
                  `${Math.round((nationalStats.overview.metersOnline / nationalStats.overview.totalMeters) * 100)}% en ligne` 
                  : 'N/A'}
              </p>
            </div>
            <Activity className="w-12 h-12 text-success-600 dark:text-success-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Incidents Ouverts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {nationalStats?.overview?.openIncidents || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                En attente de traitement
              </p>
            </div>
            <MapPin className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fraudes Détectées</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {nationalStats?.overview?.fraudIncidents || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Suspicions actives
              </p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par Type */}
        {homesByTypeData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Répartition des Foyers par Type
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={homesByTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {homesByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Répartition par Ville */}
        {citiesData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Répartition par Ville
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={citiesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ville" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="homesCount" fill="#0ea5e9" name="Nombre de foyers" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Gap Financier et Hydro en résumé */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {financialGap && (
          <div className="card border-l-4 border-primary-500 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Gap Financier
              </h3>
              <TrendingDown className="w-6 h-6 text-primary-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Déficit</span>
                <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">
                  {new Intl.NumberFormat('fr-FR').format(financialGap.deficit)} GNF
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Facture d'Achat: {new Intl.NumberFormat('fr-FR').format(financialGap.factureAchat)} GNF</p>
                <p>Recettes: {new Intl.NumberFormat('fr-FR').format(financialGap.recettesCollectees)} GNF</p>
                <p className="mt-2 font-semibold">
                  Déficit: {financialGap.deficitPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {hydroPlanning && (
          <div className="card border-l-4 border-success-500 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Production Hydroélectrique
              </h3>
              <Zap className="w-6 h-6 text-success-600" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Production Totale</p>
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {hydroPlanning.totalHydroProduction?.toFixed(0) || 0} MW
                </p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-semibold text-success-600 dark:text-success-400">
                  Économie estimée: {new Intl.NumberFormat('fr-FR').format(hydroPlanning.impactCout?.economieEstimee || 0)} GNF
                </p>
                <p className="text-xs mt-1">{hydroPlanning.impactCout?.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logic de Souveraineté Énergétique */}
      {financialGap && (
        <div className="card border-l-4 border-success-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Indépendance Énergétique (Souveraineté)
            </h3>
            <Shield className="w-6 h-6 text-success-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Part Énergie Renouvelable</p>
              <div className="flex items-end space-x-2">
                <p className="text-3xl font-bold text-success-600 dark:text-success-400">
                  {financialGap.sovereigntyData?.renewablePercent?.toFixed(1) || 45.2}%
                </p>
                <p className="text-sm text-gray-500 mb-1">(Hydro + Solaire)</p>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {financialGap.sovereigntyData?.renewableEnergyMW?.toFixed(0) || 580} MW
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Part Énergie Importée</p>
              <div className="flex items-end space-x-2">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {financialGap.sovereigntyData?.importedPercent?.toFixed(1) || 54.8}%
                </p>
                <p className="text-sm text-gray-500 mb-1">(Thermique + Interconnexion)</p>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {financialGap.sovereigntyData?.importedEnergyMW?.toFixed(0) || 700} MW
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Objectif 2030:</strong> Atteindre 70% d'indépendance énergétique grâce à l'expansion hydroélectrique et solaire.
              Réduction du déficit de {financialGap.sovereigntyData?.deficitReductionPercent?.toFixed(1) || 12.5}% grâce à la technologie SIGE.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewSection;
