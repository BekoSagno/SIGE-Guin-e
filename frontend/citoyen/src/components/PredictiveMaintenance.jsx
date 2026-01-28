import { useState, useEffect } from 'react';
import { apiClient } from '@common/services';
import { 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  TrendingUp, 
  Wrench, 
  Zap, 
  Thermometer,
  Clock,
  Info,
  XCircle
} from 'lucide-react';

function PredictiveMaintenance({ homeId, userRole, permissions }) {
  const [alerts, setAlerts] = useState([]);
  const [devicesHealth, setDevicesHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    if (homeId) {
      loadDiagnostics();
      loadAlerts();
    }
  }, [homeId]);

  const loadDiagnostics = async () => {
    try {
      const response = await apiClient.get(`/energy/maintenance/diagnostics?homeId=${homeId}`);
      setDevicesHealth(response.data.devices || []);
    } catch (error) {
      // En mode simulation, créer des données de test
      console.log('Diagnostics non disponibles, simulation...', error);
      setDevicesHealth(generateMockDevicesHealth());
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await apiClient.get(`/energy/maintenance/alerts?homeId=${homeId}`);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      // En mode simulation, pas d'alertes
      console.log('Alertes non disponibles', error);
      setAlerts([]);
    }
  };

  const generateMockDevicesHealth = () => {
    // Simulation de santé des appareils
    return [
      {
        id: '1',
        deviceName: 'Réfrigérateur',
        deviceType: 'FRIGO',
        healthScore: 85,
        status: 'GOOD',
        lastMaintenance: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Il y a 90 jours
        predictedFailureDate: null,
        metrics: {
          powerConsumption: { value: 200, trend: 'stable', status: 'NORMAL' },
          temperature: { value: 4.2, trend: 'stable', status: 'NORMAL' },
          vibration: { value: 0.5, trend: 'increasing', status: 'WARNING' },
        },
        recommendations: [],
      },
      {
        id: '2',
        deviceName: 'Climatiseur',
        deviceType: 'AC',
        healthScore: 72,
        status: 'WARNING',
        lastMaintenance: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Il y a 180 jours
        predictedFailureDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Dans 60 jours
        metrics: {
          powerConsumption: { value: 1500, trend: 'increasing', status: 'WARNING' },
          temperature: { value: 22, trend: 'stable', status: 'NORMAL' },
          efficiency: { value: 65, trend: 'decreasing', status: 'WARNING' },
        },
        recommendations: [
          { type: 'CLEANING', priority: 'HIGH', message: 'Nettoyer les filtres' },
          { type: 'CHECKUP', priority: 'MEDIUM', message: 'Vérifier le niveau de gaz' },
        ],
      },
      {
        id: '3',
        deviceName: 'Lave-linge',
        deviceType: 'WASHING_MACHINE',
        healthScore: 95,
        status: 'EXCELLENT',
        lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Il y a 30 jours
        predictedFailureDate: null,
        metrics: {
          powerConsumption: { value: 1200, trend: 'stable', status: 'NORMAL' },
          vibration: { value: 0.2, trend: 'stable', status: 'NORMAL' },
          cycles: { value: 450, trend: 'stable', status: 'NORMAL' },
        },
        recommendations: [],
      },
    ];
  };

  const getHealthColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'accent';
    return 'error';
  };

  const getStatusBadge = (status) => {
    const badges = {
      EXCELLENT: { label: 'Excellent', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300', icon: CheckCircle },
      GOOD: { label: 'Bon', color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300', icon: CheckCircle },
      WARNING: { label: 'Attention', color: 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300', icon: AlertTriangle },
      CRITICAL: { label: 'Critique', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
    };
    return badges[status] || badges.GOOD;
  };

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-accent-600 dark:text-accent-400" />;
    if (trend === 'decreasing') return <TrendingUp className="w-4 h-4 text-success-600 dark:text-success-400 rotate-180" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Analyse en cours...</div>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
  const warningAlerts = alerts.filter(a => a.severity === 'WARNING');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Diagnostic IA - Maintenance Prédictive</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Surveillance intelligente de vos appareils</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticalAlerts.length > 0 && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-bold text-red-700 dark:text-red-300">{criticalAlerts.length} Critique{alerts.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
            {warningAlerts.length > 0 && (
              <div className="px-4 py-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl border-2 border-accent-200 dark:border-accent-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                  <span className="font-bold text-accent-700 dark:text-accent-300">{warningAlerts.length} Avertissement{warningAlerts.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alertes critiques en haut */}
        {criticalAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {criticalAlerts.map((alert, index) => (
              <div
                key={alert.id || index}
                className="p-4 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 rounded-xl animate-slide-down"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start space-x-3">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-red-800 dark:text-red-300">{alert.deviceName || 'Appareil'}</h4>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                        CRITIQUE
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">{alert.message || alert.description}</p>
                    {alert.recommendation && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        <strong>Recommandation :</strong> {alert.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vue d'ensemble des appareils */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devicesHealth.map((device, index) => {
            const healthColor = getHealthColor(device.healthScore);
            const statusBadge = getStatusBadge(device.status);
            const BadgeIcon = statusBadge.icon;

            return (
              <div
                key={device.id}
                className={`p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 animate-slide-up cursor-pointer ${
                  device.status === 'CRITICAL' 
                    ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-red-300 dark:border-red-700'
                    : device.status === 'WARNING'
                    ? 'bg-gradient-to-br from-accent-50 to-accent-100/50 dark:from-accent-900/20 dark:to-accent-800/20 border-accent-300 dark:border-accent-700'
                    : 'bg-gradient-to-br from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 border-success-300 dark:border-success-700'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1">{device.deviceName}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{device.deviceType}</p>
                  </div>
                  <span className={`${statusBadge.color} px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-semibold`}>
                    <BadgeIcon className="w-3 h-3" />
                    {statusBadge.label}
                  </span>
                </div>

                {/* Score de santé */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Score de santé</span>
                    <span className={`text-lg font-extrabold ${
                      healthColor === 'success' ? 'text-success-600 dark:text-success-400' :
                      healthColor === 'accent' ? 'text-accent-600 dark:text-accent-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {device.healthScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        healthColor === 'success' ? 'bg-success-500' :
                        healthColor === 'accent' ? 'bg-accent-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${device.healthScore}%` }}
                    />
                  </div>
                </div>

                {/* Métriques clés */}
                <div className="space-y-2 mb-3">
                  {Object.entries(device.metrics || {}).slice(0, 2).map(([key, metric]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(metric.trend)}
                        <span className={`font-semibold ${
                          metric.status === 'NORMAL' ? 'text-gray-700 dark:text-gray-300' :
                          metric.status === 'WARNING' ? 'text-accent-600 dark:text-accent-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {metric.value} {key.includes('temperature') ? '°C' : key.includes('power') || key.includes('consumption') ? 'W' : key.includes('efficiency') ? '%' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dernière maintenance */}
                {device.lastMaintenance && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Maintenance il y a {Math.floor((Date.now() - new Date(device.lastMaintenance).getTime()) / (1000 * 60 * 60 * 24))} jours</span>
                    </div>
                  </div>
                )}

                {/* Prédiction de défaillance */}
                {device.predictedFailureDate && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Risque estimé dans {Math.floor((new Date(device.predictedFailureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} jours</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Détails de l'appareil sélectionné */}
        {selectedDevice && (
          <div className="mt-6 p-5 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border-2 border-primary-200 dark:border-primary-800 animate-slide-down">
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Détails - {selectedDevice.deviceName}</h4>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Toutes les métriques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {Object.entries(selectedDevice.metrics || {}).map(([key, metric]) => (
                <div key={key} className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <div className="flex items-end justify-between">
                    <span className={`text-xl font-extrabold ${
                      metric.status === 'NORMAL' ? 'text-gray-700 dark:text-gray-300' :
                      metric.status === 'WARNING' ? 'text-accent-600 dark:text-accent-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {metric.value}
                      {key.includes('temperature') ? '°C' : 
                       key.includes('power') || key.includes('consumption') ? 'W' : 
                       key.includes('efficiency') ? '%' : 
                       key.includes('vibration') ? 'g' : ''}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      metric.status === 'NORMAL' ? 'bg-success-100 dark:bg-success-900/30 text-success-700' :
                      metric.status === 'WARNING' ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700' :
                      'bg-red-100 dark:bg-red-900/30 text-red-700'
                    }`}>
                      {metric.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommandations */}
            {selectedDevice.recommendations && selectedDevice.recommendations.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary-600" />
                  Recommandations
                </h5>
                <div className="space-y-2">
                  {selectedDevice.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        rec.priority === 'HIGH' 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                          : rec.priority === 'MEDIUM'
                          ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-500'
                          : 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Wrench className={`w-4 h-4 mt-0.5 ${
                          rec.priority === 'HIGH' ? 'text-red-600' :
                          rec.priority === 'MEDIUM' ? 'text-accent-600' :
                          'text-primary-600'
                        }`} />
                        <div>
                          <span className={`text-xs font-semibold ${
                            rec.priority === 'HIGH' ? 'text-red-700 dark:text-red-300' :
                            rec.priority === 'MEDIUM' ? 'text-accent-700 dark:text-accent-300' :
                            'text-primary-700 dark:text-primary-300'
                          }`}>
                            {rec.type} - {rec.priority}
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{rec.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pas de recommandations */}
            {(!selectedDevice.recommendations || selectedDevice.recommendations.length === 0) && (
              <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg border-l-4 border-success-500 text-center">
                <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-success-700 dark:text-success-300">
                  Aucune action requise - Appareil en bon état
                </p>
              </div>
            )}
          </div>
        )}

        {/* Message si aucun appareil */}
        {devicesHealth.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucun appareil détecté</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Les diagnostics seront disponibles une fois que vos appareils seront identifiés par le système NILM
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PredictiveMaintenance;
