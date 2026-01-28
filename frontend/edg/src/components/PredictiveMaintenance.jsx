import { useState, useEffect } from 'react';
import { 
  Wrench, AlertTriangle, Calendar, ThermometerSun, Activity, TrendingUp,
  Clock, CheckCircle, XCircle, FileText, ChevronRight, Zap, Shield,
  BarChart3, Settings, Bell
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

// Données simulées des transformateurs avec historique de maintenance
const MOCK_TRANSFORMERS_MAINTENANCE = [
  {
    id: 'TRANS-DIXINN-001',
    name: 'Poste Source Dixinn',
    zone: 'Dixinn',
    installationDate: '2015-03-20',
    lastMaintenance: '2024-06-20',
    nextMaintenanceScheduled: null,
    capacity: 800, // kVA
    age: 9, // années
    healthScore: 45,
    status: 'CRITICAL',
    predictedFailure: '2025-03-15',
    riskLevel: 'HIGH',
    metrics: {
      temperature: { current: 72, avg: 58, max: 85, trend: 'UP' },
      oilLevel: { current: 78, min: 80, status: 'LOW' },
      vibration: { current: 2.4, normal: 1.5, status: 'HIGH' },
      loadCycles: { total: 45230, dailyAvg: 14 },
      heatCycles: { critical: 156, normal: 50 },
    },
    anomalies: [
      { type: 'MICRO_ARC', detected: '2024-12-01', severity: 'HIGH', description: 'Micro-arcs détectés dans le bobinage' },
      { type: 'OVERHEATING', detected: '2024-11-15', severity: 'MEDIUM', description: 'Surchauffe persistante >65°C' },
    ],
    maintenanceHistory: [
      { date: '2024-06-20', type: 'PREVENTIVE', description: 'Changement huile isolante', cost: 2500000 },
      { date: '2023-12-10', type: 'CORRECTIVE', description: 'Remplacement radiateur', cost: 8500000 },
    ],
    estimatedReplacementCost: 500000000, // 500M GNF
    estimatedPreventiveCost: 15000000, // 15M GNF
  },
  {
    id: 'TRANS-RATOMA-001',
    name: 'Poste Source Ratoma',
    zone: 'Ratoma',
    installationDate: '2018-07-15',
    lastMaintenance: '2024-08-10',
    nextMaintenanceScheduled: '2025-02-10',
    capacity: 1000,
    age: 6,
    healthScore: 72,
    status: 'WARNING',
    predictedFailure: null,
    riskLevel: 'MEDIUM',
    metrics: {
      temperature: { current: 58, avg: 52, max: 70, trend: 'STABLE' },
      oilLevel: { current: 92, min: 80, status: 'OK' },
      vibration: { current: 1.8, normal: 1.5, status: 'SLIGHTLY_HIGH' },
      loadCycles: { total: 28450, dailyAvg: 13 },
      heatCycles: { critical: 45, normal: 50 },
    },
    anomalies: [
      { type: 'VIBRATION', detected: '2024-11-20', severity: 'LOW', description: 'Légère augmentation des vibrations' },
    ],
    maintenanceHistory: [
      { date: '2024-08-10', type: 'PREVENTIVE', description: 'Inspection générale', cost: 1200000 },
    ],
    estimatedReplacementCost: 650000000,
    estimatedPreventiveCost: 8000000,
  },
  {
    id: 'TRANS-KALOUM-001',
    name: 'Poste Source Kaloum',
    zone: 'Kaloum',
    installationDate: '2020-02-28',
    lastMaintenance: '2024-11-01',
    nextMaintenanceScheduled: '2025-05-01',
    capacity: 630,
    age: 4,
    healthScore: 92,
    status: 'NORMAL',
    predictedFailure: null,
    riskLevel: 'LOW',
    metrics: {
      temperature: { current: 45, avg: 42, max: 55, trend: 'STABLE' },
      oilLevel: { current: 98, min: 80, status: 'OK' },
      vibration: { current: 1.2, normal: 1.5, status: 'OK' },
      loadCycles: { total: 15680, dailyAvg: 11 },
      heatCycles: { critical: 12, normal: 50 },
    },
    anomalies: [],
    maintenanceHistory: [
      { date: '2024-11-01', type: 'PREVENTIVE', description: 'Contrôle routine', cost: 800000 },
    ],
    estimatedReplacementCost: 420000000,
    estimatedPreventiveCost: 5000000,
  },
  {
    id: 'TRANS-MATOTO-001',
    name: 'Poste Source Matoto',
    zone: 'Matoto',
    installationDate: '2016-11-10',
    lastMaintenance: '2024-07-25',
    nextMaintenanceScheduled: '2025-01-25',
    capacity: 750,
    age: 8,
    healthScore: 68,
    status: 'WARNING',
    predictedFailure: null,
    riskLevel: 'MEDIUM',
    metrics: {
      temperature: { current: 52, avg: 48, max: 65, trend: 'UP' },
      oilLevel: { current: 85, min: 80, status: 'OK' },
      vibration: { current: 1.6, normal: 1.5, status: 'OK' },
      loadCycles: { total: 38920, dailyAvg: 13 },
      heatCycles: { critical: 78, normal: 50 },
    },
    anomalies: [],
    maintenanceHistory: [
      { date: '2024-07-25', type: 'PREVENTIVE', description: 'Changement joints', cost: 3200000 },
    ],
    estimatedReplacementCost: 520000000,
    estimatedPreventiveCost: 12000000,
  },
];

function PredictiveMaintenance() {
  const notify = useNotification();
  const [transformers, setTransformers] = useState(MOCK_TRANSFORMERS_MAINTENANCE);
  const [selectedTransformer, setSelectedTransformer] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [filterRisk, setFilterRisk] = useState('all');

  const handleScheduleMaintenance = (transformer) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Planifier une maintenance préventive ?',
      message: `Un ordre de maintenance sera créé pour ${transformer.name}. Coût estimé: ${(transformer.estimatedPreventiveCost / 1000000).toFixed(1)}M GNF. Cela peut éviter un remplacement à ${(transformer.estimatedReplacementCost / 1000000).toFixed(0)}M GNF.`,
      type: 'info',
      confirmText: 'Planifier',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        setTransformers(prev => prev.map(t => {
          if (t.id === transformer.id) {
            return {
              ...t,
              nextMaintenanceScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            };
          }
          return t;
        }));
        notify.success(`Maintenance planifiée pour ${transformer.name}`, {
          title: '📅 Ordre de maintenance créé',
          duration: 5000,
        });
      },
    });
  };

  const filteredTransformers = filterRisk === 'all'
    ? transformers
    : transformers.filter(t => t.riskLevel === filterRisk);

  const stats = {
    critical: transformers.filter(t => t.status === 'CRITICAL').length,
    warning: transformers.filter(t => t.status === 'WARNING').length,
    healthy: transformers.filter(t => t.status === 'NORMAL').length,
    avgHealthScore: Math.round(transformers.reduce((sum, t) => sum + t.healthScore, 0) / transformers.length),
    totalPreventiveCost: transformers.reduce((sum, t) => sum + t.estimatedPreventiveCost, 0),
    totalReplacementCost: transformers.reduce((sum, t) => sum + t.estimatedReplacementCost, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Maintenance Prédictive
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analyse IA du vieillissement des transformateurs
          </p>
        </div>
      </div>

      {/* Alerte critique */}
      {stats.critical > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-200">
                {stats.critical} transformateur(s) nécessite(nt) une intervention urgente !
              </h3>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                L'IA a détecté des anomalies critiques. Une maintenance préventive peut éviter une panne coûteuse.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Score santé moyen</p>
              <p className={`text-2xl font-bold ${
                stats.avgHealthScore > 80 ? 'text-success-600' :
                stats.avgHealthScore > 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {stats.avgHealthScore}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <div className="danger-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critiques</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="warning-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">À surveiller</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.warning}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="success-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En bonne santé</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.healthy}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success-500" />
          </div>
        </div>
      </div>

      {/* Économies potentielles */}
      <div className="card bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-l-4 border-success-500">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-success-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-success-600 dark:text-success-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-success-800 dark:text-success-200">
              Économies potentielles avec maintenance préventive
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-xs text-success-600">Coût préventif total</p>
                <p className="text-lg font-bold text-success-700">{(stats.totalPreventiveCost / 1000000).toFixed(0)}M GNF</p>
              </div>
              <div>
                <p className="text-xs text-success-600">Coût remplacement évité</p>
                <p className="text-lg font-bold text-success-700">{(stats.totalReplacementCost / 1000000000).toFixed(2)}Mrd GNF</p>
              </div>
              <div>
                <p className="text-xs text-success-600">Ratio économie</p>
                <p className="text-lg font-bold text-success-700">
                  {Math.round(stats.totalReplacementCost / stats.totalPreventiveCost)}x
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {['all', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
          <button
            key={risk}
            onClick={() => setFilterRisk(risk)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterRisk === risk
                ? risk === 'HIGH' ? 'bg-red-500 text-white' :
                  risk === 'MEDIUM' ? 'bg-amber-500 text-white' :
                  risk === 'LOW' ? 'bg-success-500 text-white' :
                  'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {risk === 'all' ? 'Tous' : `Risque ${risk}`}
          </button>
        ))}
      </div>

      {/* Liste des transformateurs */}
      <div className="space-y-4">
        {filteredTransformers.map((transformer) => (
          <TransformerMaintenanceCard
            key={transformer.id}
            transformer={transformer}
            onSelect={() => setSelectedTransformer(transformer)}
            onSchedule={() => handleScheduleMaintenance(transformer)}
          />
        ))}
      </div>

      {/* Modal détails */}
      {selectedTransformer && (
        <TransformerMaintenanceModal
          transformer={selectedTransformer}
          onClose={() => setSelectedTransformer(null)}
          onSchedule={() => handleScheduleMaintenance(selectedTransformer)}
        />
      )}

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
}

function TransformerMaintenanceCard({ transformer, onSelect, onSchedule }) {
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getHealthBg = (score) => {
    if (score >= 80) return 'bg-success-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={`card border-l-4 ${
      transformer.status === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
      transformer.status === 'WARNING' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' :
      'border-success-500 bg-success-50 dark:bg-success-900/10'
    } hover:shadow-lg transition-all`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          {/* Score de santé circulaire */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32" cy="32" r="28"
                className="stroke-gray-200 dark:stroke-gray-700"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="32" cy="32" r="28"
                className={`${getHealthBg(transformer.healthScore).replace('bg-', 'stroke-')}`}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${transformer.healthScore * 1.76} 176`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${getHealthColor(transformer.healthScore)}`}>
                {transformer.healthScore}
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900 dark:text-gray-100">{transformer.name}</h4>
              <span className={`badge ${
                transformer.riskLevel === 'HIGH' ? 'badge-danger' :
                transformer.riskLevel === 'MEDIUM' ? 'badge-warning' : 'badge-success'
              }`}>
                Risque {transformer.riskLevel}
              </span>
            </div>
            <p className="text-sm text-gray-500">{transformer.zone} • {transformer.age} ans • {transformer.capacity} kVA</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-500">Température</p>
                <p className={`font-semibold ${transformer.metrics.temperature.current > 65 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                  {transformer.metrics.temperature.current}°C
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Huile</p>
                <p className={`font-semibold ${transformer.metrics.oilLevel.status !== 'OK' ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>
                  {transformer.metrics.oilLevel.current}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vibrations</p>
                <p className={`font-semibold ${transformer.metrics.vibration.status !== 'OK' ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>
                  {transformer.metrics.vibration.current} mm/s
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dernière maint.</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{transformer.lastMaintenance}</p>
              </div>
            </div>

            {transformer.predictedFailure && (
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-300">
                  Panne probable: <strong>{transformer.predictedFailure}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
          <button onClick={onSelect} className="btn-secondary text-sm px-3 py-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analyse</span>
          </button>
          {!transformer.nextMaintenanceScheduled && transformer.status !== 'NORMAL' && (
            <button onClick={onSchedule} className="btn-primary text-sm px-3 py-2">
              <Wrench className="w-4 h-4" />
              <span>Planifier</span>
            </button>
          )}
          {transformer.nextMaintenanceScheduled && (
            <span className="badge-info flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{transformer.nextMaintenanceScheduled}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TransformerMaintenanceModal({ transformer, onClose, onSchedule }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 ${
          transformer.status === 'CRITICAL' ? 'bg-gradient-to-r from-red-500 to-red-600' :
          transformer.status === 'WARNING' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
          'bg-gradient-to-r from-success-500 to-success-600'
        }`}>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{transformer.name}</h3>
              <p className="text-white/80">{transformer.zone} • Installé en {transformer.installationDate.split('-')[0]}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Métriques détaillées */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <ThermometerSun className={`w-6 h-6 mx-auto mb-2 ${transformer.metrics.temperature.current > 65 ? 'text-red-500' : 'text-primary-500'}`} />
              <p className="text-xs text-gray-500">Température</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{transformer.metrics.temperature.current}°C</p>
              <p className="text-xs text-gray-500">Max: {transformer.metrics.temperature.max}°C</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <Activity className={`w-6 h-6 mx-auto mb-2 ${transformer.metrics.oilLevel.status !== 'OK' ? 'text-amber-500' : 'text-primary-500'}`} />
              <p className="text-xs text-gray-500">Niveau huile</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{transformer.metrics.oilLevel.current}%</p>
              <p className="text-xs text-gray-500">Min: {transformer.metrics.oilLevel.min}%</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <Settings className={`w-6 h-6 mx-auto mb-2 ${transformer.metrics.vibration.status !== 'OK' ? 'text-amber-500' : 'text-primary-500'}`} />
              <p className="text-xs text-gray-500">Vibrations</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{transformer.metrics.vibration.current}</p>
              <p className="text-xs text-gray-500">Normal: {transformer.metrics.vibration.normal}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-primary-500" />
              <p className="text-xs text-gray-500">Cycles chaleur</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{transformer.metrics.heatCycles.critical}</p>
              <p className="text-xs text-gray-500">Critiques</p>
            </div>
          </div>

          {/* Anomalies détectées */}
          {transformer.anomalies.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Anomalies détectées par l'IA</h4>
              <div className="space-y-2">
                {transformer.anomalies.map((anomaly, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                    anomaly.severity === 'HIGH' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                    anomaly.severity === 'MEDIUM' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                    'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{anomaly.type}</span>
                      <span className={`badge ${
                        anomaly.severity === 'HIGH' ? 'badge-danger' :
                        anomaly.severity === 'MEDIUM' ? 'badge-warning' : 'badge-info'
                      }`}>{anomaly.severity}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{anomaly.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Détecté le {anomaly.detected}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique maintenance */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Historique des maintenances</h4>
            <div className="space-y-2">
              {transformer.maintenanceHistory.map((maint, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{maint.description}</p>
                    <p className="text-sm text-gray-500">{maint.date} • {maint.type}</p>
                  </div>
                  <span className="font-semibold text-primary-600">{(maint.cost / 1000000).toFixed(1)}M GNF</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coûts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
              <p className="text-sm text-success-600">Coût maintenance préventive</p>
              <p className="text-2xl font-bold text-success-700">{(transformer.estimatedPreventiveCost / 1000000).toFixed(0)}M GNF</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-red-600">Coût remplacement si panne</p>
              <p className="text-2xl font-bold text-red-700">{(transformer.estimatedReplacementCost / 1000000).toFixed(0)}M GNF</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Fermer</button>
          {!transformer.nextMaintenanceScheduled && (
            <button onClick={() => { onSchedule(); onClose(); }} className="btn-primary">
              <Wrench className="w-4 h-4" />
              <span>Planifier maintenance</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictiveMaintenance;
