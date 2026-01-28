import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Zap, Users, Calendar, Download, Filter } from 'lucide-react';

function AnalyticsModule({ stats }) {
  const [period, setPeriod] = useState('month');

  // Données simulées pour les graphiques
  const consumptionData = [
    { label: 'Lun', value: 850 },
    { label: 'Mar', value: 920 },
    { label: 'Mer', value: 780 },
    { label: 'Jeu', value: 1050 },
    { label: 'Ven', value: 980 },
    { label: 'Sam', value: 650 },
    { label: 'Dim', value: 450 },
  ];

  const maxValue = Math.max(...consumptionData.map(d => d.value));

  const kpis = [
    { 
      label: 'Consommation totale',
      value: '4,680 kWh',
      change: +5.2,
      icon: Zap,
      color: 'primary'
    },
    { 
      label: 'Clients actifs',
      value: stats?.totalClients || '156',
      change: +2.1,
      icon: Users,
      color: 'success'
    },
    { 
      label: 'Efficacité réseau',
      value: '94.5%',
      change: +1.2,
      icon: BarChart3,
      color: 'accent'
    },
    { 
      label: 'Pic de charge',
      value: '1,050 kW',
      change: -3.4,
      icon: TrendingUp,
      color: 'warning'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytique
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Tableaux de bord et indicateurs de performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input w-auto"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <button className="btn-secondary">
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const colorClasses = {
            primary: 'from-primary-500 to-primary-600',
            success: 'from-success-500 to-success-600',
            accent: 'from-purple-500 to-purple-600',
            warning: 'from-amber-500 to-amber-600',
          };

          return (
            <div key={index} className="card relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colorClasses[kpi.color]} opacity-10 rounded-bl-full`}></div>
              
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{kpi.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {kpi.value}
                  </p>
                  <div className={`flex items-center mt-2 text-sm ${kpi.change >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                    {kpi.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    <span>{Math.abs(kpi.change)}%</span>
                  </div>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${colorClasses[kpi.color]} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphique consommation */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Consommation Hebdomadaire
          </h3>
          <span className="badge-info">7 derniers jours</span>
        </div>

        {/* Graphique en barres simple */}
        <div className="h-64 flex items-end justify-between space-x-2 sm:space-x-4">
          {consumptionData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center">
                <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {data.value}
                </span>
                <div 
                  className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all duration-500 hover:from-primary-600 hover:to-primary-500"
                  style={{ height: `${(data.value / maxValue) * 180}px` }}
                />
              </div>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                {data.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Répartition par Zone
          </h3>
          <div className="space-y-4">
            {[
              { zone: 'Conakry Centre', percent: 35, value: '1,638 kWh' },
              { zone: 'Ratoma', percent: 28, value: '1,310 kWh' },
              { zone: 'Matam', percent: 22, value: '1,030 kWh' },
              { zone: 'Autres', percent: 15, value: '702 kWh' },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{item.zone}</span>
                  <span className="text-gray-600 dark:text-gray-400">{item.value} ({item.percent}%)</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill progress-success"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Tendances Mensuelles
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Consommation moyenne', current: '450 kWh', previous: '420 kWh', change: +7.1 },
              { label: 'Nouveaux clients', current: '12', previous: '8', change: +50 },
              { label: 'Incidents résolus', current: '28', previous: '35', change: -20 },
              { label: 'Taux de recouvrement', current: '92%', previous: '89%', change: +3.4 },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Précédent: {item.previous}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-gray-100">{item.current}</p>
                  <p className={`text-sm flex items-center justify-end ${item.change >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                    {item.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {Math.abs(item.change)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsModule;
