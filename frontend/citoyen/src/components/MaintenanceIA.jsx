import { useState, useEffect } from 'react';
import { maintenanceService } from '@common/services';
import { 
  Wrench, AlertTriangle, CheckCircle, XCircle, Activity, 
  TrendingUp, TrendingDown, Minus, Calendar, Clock,
  Lightbulb, Snowflake, Wind, Tv, Droplets, Monitor,
  Zap, RefreshCw, ChevronDown, ChevronUp, Shield
} from 'lucide-react';

function MaintenanceIA({ homeId }) {
  const [diagnostics, setDiagnostics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDevice, setExpandedDevice] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (homeId) {
      loadData();
    } else {
      setLoading(false);
      setError('Aucun foyer sélectionné');
    }
  }, [homeId]);

  const loadData = async () => {
    try {
      setError(null);
      const [diagResponse, alertsResponse] = await Promise.all([
        maintenanceService.getDiagnostics(homeId),
        maintenanceService.getAlerts(homeId),
      ]);
      setDiagnostics(diagResponse.devices || []);
      setAlerts(alertsResponse.alerts || []);
    } catch (error) {
      console.error('Erreur chargement maintenance:', error);
      setError('Erreur lors du chargement des diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getDeviceIcon = (type) => {
    const iconMap = {
      'AMPOULE': Lightbulb,
      'FRIGO': Snowflake,
      'CLIM': Wind,
      'VENTILATEUR': Wind,
      'TV': Tv,
      'CHAUFFE_EAU': Droplets,
      'ORDINATEUR': Monitor,
    };
    const IconComponent = iconMap[type?.toUpperCase()] || Zap;
    return <IconComponent className="w-6 h-6" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'EXCELLENT':
        return 'text-success-600 dark:text-success-400 bg-success-100 dark:bg-success-900/30';
      case 'GOOD':
        return 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30';
      case 'WARNING':
        return 'text-accent-600 dark:text-accent-400 bg-accent-100 dark:bg-accent-900/30';
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EXCELLENT':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'GOOD':
        return <CheckCircle className="w-5 h-5 text-primary-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-accent-500" />;
      case 'CRITICAL':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'EXCELLENT': return 'Excellent';
      case 'GOOD': return 'Bon';
      case 'WARNING': return 'Attention';
      case 'CRITICAL': return 'Critique';
      default: return 'Inconnu';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-success-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 85) return 'text-success-600 dark:text-success-400';
    if (score >= 70) return 'text-primary-600 dark:text-primary-400';
    if (score >= 50) return 'text-accent-600 dark:text-accent-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthBarColor = (score) => {
    if (score >= 85) return 'bg-success-500';
    if (score >= 70) return 'bg-primary-500';
    if (score >= 50) return 'bg-accent-500';
    return 'bg-red-500';
  };

  const formatDeviceName = (name) => {
    if (!name) return 'Appareil';
    return name
      .replace(/R\?\?frig\?\?rateur/gi, 'Réfrigérateur')
      .replace(/Refrigerateur/gi, 'Réfrigérateur')
      .replace(/\?\?/g, 'é');
  };

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Analyse IA en cours...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          <button onClick={loadData} className="mt-4 btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Calculer les statistiques globales
  const totalDevices = diagnostics.length;
  const criticalDevices = diagnostics.filter(d => d.status === 'CRITICAL').length;
  const warningDevices = diagnostics.filter(d => d.status === 'WARNING').length;
  const healthyDevices = diagnostics.filter(d => d.status === 'EXCELLENT' || d.status === 'GOOD').length;
  const averageHealth = totalDevices > 0 
    ? Math.round(diagnostics.reduce((sum, d) => sum + d.healthScore, 0) / totalDevices) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Maintenance IA</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Diagnostics prédictifs de vos appareils</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-all font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">Appareils</span>
            </div>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{totalDevices}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 rounded-xl border border-success-200 dark:border-success-800">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-success-600 dark:text-success-400" />
              <span className="text-sm font-semibold text-success-700 dark:text-success-300">Santé moyenne</span>
            </div>
            <p className={`text-2xl font-bold ${getHealthScoreColor(averageHealth)}`}>{averageHealth}%</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-accent-50 to-accent-100/50 dark:from-accent-900/20 dark:to-accent-800/20 rounded-xl border border-accent-200 dark:border-accent-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              <span className="text-sm font-semibold text-accent-700 dark:text-accent-300">Attention</span>
            </div>
            <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">{warningDevices}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">Critiques</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalDevices}</p>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="card border-2 border-red-300 dark:border-red-700">
          <h4 className="font-bold text-lg text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertes de maintenance
          </h4>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-700 dark:text-red-300">{alert.message}</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{alert.device}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des appareils */}
      {diagnostics.length === 0 ? (
        <div className="card text-center py-12">
          <Wrench className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">Aucun appareil détecté</h4>
          <p className="text-gray-500 dark:text-gray-500">
            Connectez un kit IoT pour commencer l'analyse de vos appareils
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {diagnostics.map((device, index) => (
            <div 
              key={device.id} 
              className="card hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* En-tête de l'appareil */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getStatusColor(device.status)}`}>
                    {getDeviceIcon(device.deviceType)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                      {formatDeviceName(device.deviceName)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(device.status)}
                      <span className={`text-sm font-semibold ${getStatusColor(device.status).split(' ')[0]}`}>
                        {getStatusLabel(device.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Score de santé */}
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Santé</p>
                    <p className={`text-2xl font-bold ${getHealthScoreColor(device.healthScore)}`}>
                      {device.healthScore}%
                    </p>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-24 hidden md:block">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getHealthBarColor(device.healthScore)} transition-all duration-500`}
                        style={{ width: `${device.healthScore}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {expandedDevice === device.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Détails expandables */}
              {expandedDevice === device.id && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Consommation */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Consommation</span>
                        {getTrendIcon(device.metrics?.powerConsumption?.trend)}
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {device.metrics?.powerConsumption?.value || 0} W
                      </p>
                      <p className={`text-xs font-medium ${
                        device.metrics?.powerConsumption?.status === 'WARNING' 
                          ? 'text-accent-600 dark:text-accent-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {device.metrics?.powerConsumption?.status === 'WARNING' ? 'En hausse' : 'Normal'}
                      </p>
                    </div>

                    {/* Dernière maintenance */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Dernière maintenance</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {device.lastMaintenance 
                          ? new Date(device.lastMaintenance).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })
                          : 'Jamais'
                        }
                      </p>
                    </div>

                    {/* Prédiction de panne */}
                    {device.predictedFailureDate && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">Panne prévue</span>
                        </div>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {new Date(device.predictedFailureDate).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Recommandations */}
                  {device.recommendations && device.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-accent-500" />
                        Recommandations IA
                      </h5>
                      <div className="space-y-2">
                        {device.recommendations.map((rec, idx) => (
                          <div 
                            key={idx}
                            className={`p-4 rounded-xl border ${
                              rec.priority === 'HIGH' 
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : rec.priority === 'MEDIUM'
                                ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800'
                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                rec.priority === 'HIGH' 
                                  ? 'bg-red-200 dark:bg-red-800'
                                  : rec.priority === 'MEDIUM'
                                  ? 'bg-accent-200 dark:bg-accent-800'
                                  : 'bg-gray-200 dark:bg-gray-600'
                              }`}>
                                {rec.type === 'CLEANING' && <Wrench className="w-4 h-4" />}
                                {rec.type === 'CHECKUP' && <Activity className="w-4 h-4" />}
                                {!rec.type && <AlertTriangle className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className={`font-semibold ${
                                  rec.priority === 'HIGH' 
                                    ? 'text-red-700 dark:text-red-300'
                                    : rec.priority === 'MEDIUM'
                                    ? 'text-accent-700 dark:text-accent-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {rec.message}
                                </p>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  rec.priority === 'HIGH' 
                                    ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
                                    : rec.priority === 'MEDIUM'
                                    ? 'bg-accent-200 dark:bg-accent-800 text-accent-700 dark:text-accent-300'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}>
                                  Priorité {rec.priority === 'HIGH' ? 'haute' : rec.priority === 'MEDIUM' ? 'moyenne' : 'basse'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note explicative */}
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-200 dark:bg-primary-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h4 className="font-bold text-primary-800 dark:text-primary-200 mb-2">Comment fonctionne la Maintenance IA ?</h4>
            <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
              <li>• L'IA analyse les patterns de consommation de chaque appareil</li>
              <li>• Elle détecte les anomalies pouvant indiquer une défaillance imminente</li>
              <li>• Des recommandations personnalisées vous aident à prolonger la durée de vie de vos appareils</li>
              <li>• Les prédictions s'améliorent avec le temps grâce à l'apprentissage automatique</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaintenanceIA;
