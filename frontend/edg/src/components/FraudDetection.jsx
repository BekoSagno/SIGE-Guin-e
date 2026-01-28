import { useState } from 'react';
import { Shield, AlertTriangle, Eye, CheckCircle, XCircle, Search, Filter, TrendingDown, Zap, MapPin } from 'lucide-react';
import { useNotification } from './Notification';

function FraudDetection({ incidents }) {
  const notify = useNotification();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');

  // Filtrer les incidents de fraude
  const fraudIncidents = incidents?.filter(i => i.incidentType === 'FRAUDE_SUSPECTEE') || [];

  // Données de démonstration enrichies
  const fraudAlerts = fraudIncidents.length > 0 ? fraudIncidents.map((inc, idx) => ({
    ...inc,
    priority: idx === 0 ? 'CRITICAL' : idx === 1 ? 'HIGH' : 'MEDIUM',
    anomalyType: ['Consommation anormale', 'Manipulation compteur', 'Bypass détecté'][idx % 3],
    deviation: Math.round(Math.random() * 50 + 20),
    estimatedLoss: Math.round(Math.random() * 500000 + 100000),
  })) : [
    {
      id: 'demo-1',
      description: 'Écart important entre énergie injectée et facturée',
      priority: 'CRITICAL',
      anomalyType: 'Manipulation compteur',
      deviation: 45,
      estimatedLoss: 450000,
      home: { nom: 'Zone Industrielle A', ville: 'Conakry' },
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      description: 'Signature électrique anormale détectée',
      priority: 'HIGH',
      anomalyType: 'Bypass détecté',
      deviation: 32,
      estimatedLoss: 280000,
      home: { nom: 'Quartier Madina', ville: 'Conakry' },
      status: 'INVESTIGATING',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo-3',
      description: 'Consommation nocturne suspecte',
      priority: 'MEDIUM',
      anomalyType: 'Consommation anormale',
      deviation: 25,
      estimatedLoss: 150000,
      home: { nom: 'Résidence Bambeto', ville: 'Ratoma' },
      status: 'OPEN',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const filteredAlerts = filterPriority === 'all' 
    ? fraudAlerts 
    : fraudAlerts.filter(a => a.priority === filterPriority);

  const stats = {
    total: fraudAlerts.length,
    critical: fraudAlerts.filter(a => a.priority === 'CRITICAL').length,
    high: fraudAlerts.filter(a => a.priority === 'HIGH').length,
    totalLoss: fraudAlerts.reduce((sum, a) => sum + (a.estimatedLoss || 0), 0),
  };

  const handleInvestigate = (alert) => {
    notify.info(`Investigation lancée pour ${alert.home?.nom}`, {
      title: '🔍 Investigation en cours',
    });
  };

  const handleDismiss = (alert) => {
    notify.success('Alerte classée sans suite', {
      title: '✅ Alerte fermée',
    });
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', badge: 'badge-danger', border: 'border-red-500' };
      case 'HIGH':
        return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', badge: 'badge-warning', border: 'border-amber-500' };
      default:
        return { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-700 dark:text-primary-300', badge: 'badge-info', border: 'border-primary-500' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Détection de Fraude
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analyse NILM et réconciliation énergétique
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="danger-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Alertes totales</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.total}</p>
            </div>
            <Shield className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critiques</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
          </div>
        </div>

        <div className="warning-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Priorité haute</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.high}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pertes estimées</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(stats.totalLoss / 1000000).toFixed(2)}M
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer par priorité:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'CRITICAL', 'HIGH', 'MEDIUM'].map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterPriority === priority
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {priority === 'all' ? 'Toutes' : priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Aucune alerte de fraude
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Le système n'a détecté aucune anomalie suspecte
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = getPriorityConfig(alert.priority);
            return (
              <div
                key={alert.id}
                className={`card border-l-4 ${config.border} ${config.bg} hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      alert.priority === 'CRITICAL' ? 'bg-red-500/20' : 
                      alert.priority === 'HIGH' ? 'bg-amber-500/20' : 'bg-primary-500/20'
                    }`}>
                      <Shield className={`w-6 h-6 ${config.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={config.badge}>{alert.priority}</span>
                        <span className="text-xs text-gray-500">{alert.anomalyType}</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {alert.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{alert.home?.nom}, {alert.home?.ville}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Zap className="w-4 h-4" />
                          <span>Écart: {alert.deviation}%</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Perte estimée</p>
                      <p className="font-bold text-red-600 dark:text-red-400">
                        {alert.estimatedLoss?.toLocaleString()} GNF
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInvestigate(alert); }}
                        className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 transition-colors"
                        title="Investiguer"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDismiss(alert); }}
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Classer sans suite"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal détail alerte */}
      {selectedAlert && (
        <FraudDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
}

function FraudDetailModal({ alert, onClose }) {
  const config = alert.priority === 'CRITICAL' 
    ? { color: 'red', icon: AlertTriangle }
    : alert.priority === 'HIGH'
    ? { color: 'amber', icon: AlertTriangle }
    : { color: 'primary', icon: Shield };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 bg-gradient-to-r from-${config.color}-500 to-${config.color}-600`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <config.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Alerte Fraude - {alert.priority}</h3>
              <p className="text-white/80">{alert.anomalyType}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h4>
            <p className="text-gray-600 dark:text-gray-400">{alert.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">Localisation</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{alert.home?.nom}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{alert.home?.ville}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">Écart détecté</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{alert.deviation}%</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">Perte estimée</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {alert.estimatedLoss?.toLocaleString()} GNF
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">Date détection</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          <button className="btn-warning">
            Envoyer équipe terrain
          </button>
          <button className="btn-danger">
            Couper l'alimentation
          </button>
        </div>
      </div>
    </div>
  );
}

export default FraudDetection;
