import { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

function NetworkMonitoring({ stats }) {
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeData, setRealtimeData] = useState({
    totalLoad: stats?.transformers?.reduce((sum, t) => sum + (t.currentLoad || 0), 0) || 0,
    peakLoad: 0,
    efficiency: 94.5,
    uptime: 99.2,
  });

  // Simulation de données temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeData(prev => ({
        ...prev,
        totalLoad: prev.totalLoad + (Math.random() - 0.5) * 1000,
        efficiency: Math.min(100, Math.max(80, prev.efficiency + (Math.random() - 0.5) * 2)),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const transformers = stats?.transformers || [];
  const zones = stats?.zones || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Monitoring Réseau
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Surveillance en temps réel de l'infrastructure électrique
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-success-700 dark:text-success-300">En ligne</span>
          </div>
        </div>
      </div>

      {/* Stats temps réel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Charge totale</span>
            <Zap className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(realtimeData.totalLoad / 1000).toFixed(1)} kW
          </p>
          <div className="flex items-center mt-2 text-sm text-success-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Normal</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Efficacité réseau</span>
            <Activity className="w-5 h-5 text-success-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {realtimeData.efficiency.toFixed(1)}%
          </p>
          <div className="progress-bar mt-2">
            <div 
              className="progress-bar-fill progress-success"
              style={{ width: `${realtimeData.efficiency}%` }}
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
            <Wifi className="w-5 h-5 text-success-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {realtimeData.uptime}%
          </p>
          <p className="text-xs text-gray-500 mt-1">30 derniers jours</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Compteurs actifs</span>
            <Activity className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {zones.reduce((sum, z) => sum + (z.onlineMeters || 0), 0)}
          </p>
          <p className="text-xs text-success-600 mt-1">100% connectés</p>
        </div>
      </div>

      {/* Transformateurs */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            État des Transformateurs
          </h3>
          <span className="badge-info">{transformers.length} postes</span>
        </div>

        {transformers.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun transformateur configuré</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {transformers.map((transformer) => (
              <TransformerMonitorCard key={transformer.transformerId} transformer={transformer} />
            ))}
          </div>
        )}
      </div>

      {/* Carte des zones */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Zones de Distribution
          </h3>
          <span className="badge-success">{zones.length} zones actives</span>
        </div>

        {zones.length === 0 ? (
          <div className="text-center py-12">
            <Wifi className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune zone configurée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <ZoneCard key={zone.zoneId} zone={zone} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransformerMonitorCard({ transformer }) {
  const loadPercent = transformer.loadPercentage || 0;
  const status = transformer.status || 'NORMAL';

  const getStatusConfig = () => {
    if (status === 'CRITICAL' || loadPercent > 90) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-500',
        text: 'text-red-600 dark:text-red-400',
        progress: 'progress-danger',
        badge: 'badge-danger',
        icon: AlertTriangle,
      };
    }
    if (status === 'WARNING' || loadPercent > 70) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        progress: 'progress-warning',
        badge: 'badge-warning',
        icon: AlertTriangle,
      };
    }
    return {
      bg: 'bg-success-50 dark:bg-success-900/20',
      border: 'border-success-500',
      text: 'text-success-600 dark:text-success-400',
      progress: 'progress-success',
      badge: 'badge-success',
      icon: Activity,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl border-l-4 ${config.border} ${config.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${config.text}`} />
          <span className="font-bold text-gray-900 dark:text-gray-100">{transformer.zoneId}</span>
        </div>
        <span className={config.badge}>{status}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Charge</span>
          <span className={`font-semibold ${config.text}`}>{loadPercent.toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className={`progress-bar-fill ${config.progress}`}
            style={{ width: `${Math.min(loadPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{(transformer.currentLoad / 1000).toFixed(1)} kW</span>
          <span>/ {transformer.capacity} kW max</span>
        </div>
      </div>
    </div>
  );
}

function ZoneCard({ zone }) {
  const metersOnline = zone.onlineMeters || 0;

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-gray-900 dark:text-gray-100">{zone.zoneId}</span>
        <div className="flex items-center space-x-1">
          {metersOnline > 0 ? (
            <Wifi className="w-4 h-4 text-success-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Compteurs</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{metersOnline}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Statut</p>
          <span className="badge-success">Actif</span>
        </div>
      </div>
    </div>
  );
}

export default NetworkMonitoring;
