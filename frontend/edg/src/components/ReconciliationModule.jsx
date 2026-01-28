import { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, MapPin, TrendingDown, Search, Filter,
  Eye, FileText, CheckCircle, Clock, Zap, Users, Target,
  Navigation, Camera, Send
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

// Données simulées de réconciliation
const MOCK_RECONCILIATION_DATA = [
  {
    id: 'REC-001',
    zone: 'Dixinn',
    transformer: 'TRANS-DIXINN-001',
    energyInjected: 15000, // kWh injectée par le poste
    energyBilled: 12750, // kWh facturée aux clients
    delta: 2250, // kWh perdue
    deltaPercent: 15,
    status: 'CRITICAL',
    suspectedLocation: { lat: 9.5380, lng: -13.6750, address: 'Rue 45, Dixinn Centre' },
    detectedAt: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
    affectedMeters: 45,
    estimatedLoss: 450000, // GNF
  },
  {
    id: 'REC-002',
    zone: 'Ratoma',
    transformer: 'TRANS-RATOMA-001',
    energyInjected: 22000,
    energyBilled: 18920,
    delta: 3080,
    deltaPercent: 14,
    status: 'WARNING',
    suspectedLocation: { lat: 9.5850, lng: -13.6150, address: 'Avenue Fidel Castro, Ratoma' },
    detectedAt: new Date(Date.now() - 3600000).toISOString(),
    lastCheck: new Date().toISOString(),
    affectedMeters: 62,
    estimatedLoss: 616000,
  },
  {
    id: 'REC-003',
    zone: 'Matoto',
    transformer: 'TRANS-MATOTO-001',
    energyInjected: 18500,
    energyBilled: 15910,
    delta: 2590,
    deltaPercent: 14,
    status: 'WARNING',
    suspectedLocation: { lat: 9.6150, lng: -13.5750, address: 'Carrefour Matoto, Zone industrielle' },
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
    lastCheck: new Date().toISOString(),
    affectedMeters: 38,
    estimatedLoss: 518000,
  },
  {
    id: 'REC-004',
    zone: 'Kaloum',
    transformer: 'TRANS-KALOUM-001',
    energyInjected: 12000,
    energyBilled: 11280,
    delta: 720,
    deltaPercent: 6,
    status: 'NORMAL',
    suspectedLocation: null,
    detectedAt: null,
    lastCheck: new Date().toISOString(),
    affectedMeters: 0,
    estimatedLoss: 0,
  },
];

// Historique des interventions
const MOCK_INTERVENTIONS = [
  {
    id: 'INT-001',
    reconciliationId: 'REC-005',
    zone: 'Matam',
    status: 'COMPLETED',
    result: 'Branchement clandestin découvert',
    recoveredAmount: 850000,
    date: '2024-12-15',
  },
  {
    id: 'INT-002',
    reconciliationId: 'REC-006',
    zone: 'Dixinn',
    status: 'COMPLETED',
    result: 'Compteur défectueux remplacé',
    recoveredAmount: 320000,
    date: '2024-12-10',
  },
];

function ReconciliationModule() {
  const notify = useNotification();
  const [reconciliationData, setReconciliationData] = useState(MOCK_RECONCILIATION_DATA);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [isCalculating, setIsCalculating] = useState(false);

  // Simuler le calcul de réconciliation toutes les 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      // Simuler une mise à jour des données
      setReconciliationData(prev => prev.map(item => ({
        ...item,
        lastCheck: new Date().toISOString(),
        deltaPercent: Math.max(0, item.deltaPercent + (Math.random() - 0.5) * 2),
      })));
    }, 60000); // Vérifier toutes les minutes en dev

    return () => clearInterval(interval);
  }, []);

  const handleRunReconciliation = async () => {
    setIsCalculating(true);
    notify.info('Calcul de réconciliation en cours...', { title: '🔄 Analyse' });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setReconciliationData(prev => prev.map(item => ({
      ...item,
      lastCheck: new Date().toISOString(),
    })));
    
    setIsCalculating(false);
    notify.success('Réconciliation terminée. 3 anomalies détectées.', { 
      title: '✅ Analyse complète',
      duration: 5000,
    });
  };

  const handleCreateTicket = (item) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Créer un ticket d\'intervention ?',
      message: `Un ticket d'audit fraude sera créé pour la zone ${item.zone} avec les coordonnées GPS du segment suspecté.`,
      type: 'warning',
      confirmText: 'Créer le ticket',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        notify.success(`Ticket d'intervention créé pour ${item.zone}`, {
          title: '🎫 Ticket #${Date.now().toString().slice(-6)}',
          duration: 5000,
        });
      },
    });
  };

  const filteredData = filterStatus === 'all'
    ? reconciliationData
    : reconciliationData.filter(item => item.status === filterStatus);

  const stats = {
    totalLoss: reconciliationData.reduce((sum, item) => sum + item.estimatedLoss, 0),
    criticalZones: reconciliationData.filter(item => item.status === 'CRITICAL').length,
    warningZones: reconciliationData.filter(item => item.status === 'WARNING').length,
    totalDelta: reconciliationData.reduce((sum, item) => sum + item.delta, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Réconciliation Énergétique
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Détection des pertes non-techniques et branchements clandestins
          </p>
        </div>
        
        <button
          onClick={handleRunReconciliation}
          disabled={isCalculating}
          className="btn-primary"
        >
          {isCalculating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Target className="w-5 h-5" />
          )}
          <span>{isCalculating ? 'Analyse en cours...' : 'Lancer réconciliation'}</span>
        </button>
      </div>

      {/* Formule explicative */}
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-l-4 border-primary-500">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-bold text-primary-800 dark:text-primary-200">
              Algorithme de Réconciliation
            </h3>
            <div className="mt-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg font-mono text-sm">
              <span className="text-red-600 dark:text-red-400">Delta_Pertes</span> = 
              <span className="text-primary-600 dark:text-primary-400"> Énergie_Sortie_Poste</span> - 
              <span className="text-success-600 dark:text-success-400"> Σ(Consommations_Boîtiers)</span>
            </div>
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">
              Si Delta &gt; 15%, l'IA localise le segment de rue suspecté via l'analyse des chutes de tension.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="danger-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pertes estimées</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {(stats.totalLoss / 1000000).toFixed(2)}M GNF
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zones critiques</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-300">{stats.criticalZones}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
          </div>
        </div>

        <div className="warning-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zones en alerte</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.warningZones}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Énergie perdue</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalDelta.toLocaleString()} kWh
              </p>
            </div>
            <Zap className="w-8 h-8 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {['all', 'CRITICAL', 'WARNING', 'NORMAL'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === status
                ? status === 'CRITICAL' ? 'bg-red-500 text-white' :
                  status === 'WARNING' ? 'bg-amber-500 text-white' :
                  status === 'NORMAL' ? 'bg-success-500 text-white' :
                  'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {status === 'all' ? 'Toutes les zones' : status}
          </button>
        ))}
      </div>

      {/* Liste des zones */}
      <div className="space-y-4">
        {filteredData.map((item) => (
          <ReconciliationCard
            key={item.id}
            item={item}
            onSelect={() => setSelectedItem(item)}
            onCreateTicket={() => handleCreateTicket(item)}
          />
        ))}
      </div>

      {/* Modal de détails */}
      {selectedItem && (
        <ReconciliationDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCreateTicket={() => handleCreateTicket(selectedItem)}
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

function ReconciliationCard({ item, onSelect, onCreateTicket }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'CRITICAL':
        return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-600', badge: 'badge-danger' };
      case 'WARNING':
        return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500', text: 'text-amber-600', badge: 'badge-warning' };
      default:
        return { bg: 'bg-success-50 dark:bg-success-900/20', border: 'border-success-500', text: 'text-success-600', badge: 'badge-success' };
    }
  };

  const config = getStatusConfig(item.status);

  return (
    <div className={`card border-l-4 ${config.border} ${config.bg} hover:shadow-lg transition-all`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            item.status === 'CRITICAL' ? 'bg-red-500/20' :
            item.status === 'WARNING' ? 'bg-amber-500/20' : 'bg-success-500/20'
          }`}>
            <Shield className={`w-6 h-6 ${config.text}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900 dark:text-gray-100">{item.zone}</h4>
              <span className={config.badge}>{item.status}</span>
              <span className="text-xs text-gray-500">{item.transformer}</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-500">Injectée</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.energyInjected.toLocaleString()} kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Facturée</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{item.energyBilled.toLocaleString()} kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Delta</p>
                <p className={`font-bold ${config.text}`}>{item.deltaPercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Perte estimée</p>
                <p className="font-semibold text-red-600">{item.estimatedLoss.toLocaleString()} GNF</p>
              </div>
            </div>

            {item.suspectedLocation && (
              <div className="flex items-center space-x-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>Segment suspecté: {item.suspectedLocation.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
          <button
            onClick={onSelect}
            className="btn-secondary text-sm px-3 py-2"
          >
            <Eye className="w-4 h-4" />
            <span>Détails</span>
          </button>
          {item.status !== 'NORMAL' && (
            <button
              onClick={onCreateTicket}
              className="btn-warning text-sm px-3 py-2"
            >
              <FileText className="w-4 h-4" />
              <span>Créer ticket</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReconciliationDetailModal({ item, onClose, onCreateTicket }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 ${
          item.status === 'CRITICAL' ? 'bg-gradient-to-r from-red-500 to-red-600' :
          item.status === 'WARNING' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
          'bg-gradient-to-r from-success-500 to-success-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Réconciliation - {item.zone}</h3>
                <p className="text-white/80">{item.transformer}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
              item.status === 'CRITICAL' ? 'bg-white text-red-600' :
              item.status === 'WARNING' ? 'bg-white text-amber-600' :
              'bg-white text-success-600'
            }`}>
              {item.status}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Graphique de réconciliation */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Bilan Énergétique</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Énergie injectée</span>
                  <span className="font-semibold text-primary-600">{item.energyInjected.toLocaleString()} kWh</span>
                </div>
                <div className="h-3 bg-primary-500 rounded-full"></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Énergie facturée</span>
                  <span className="font-semibold text-success-600">{item.energyBilled.toLocaleString()} kWh</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success-500 rounded-full"
                    style={{ width: `${(item.energyBilled / item.energyInjected) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Pertes (Delta)</span>
                  <span className="font-semibold text-red-600">{item.delta.toLocaleString()} kWh ({item.deltaPercent.toFixed(1)}%)</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${item.deltaPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Localisation suspectée */}
          {item.suspectedLocation && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 dark:text-red-200">Segment suspecté</h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{item.suspectedLocation.address}</p>
                  <p className="text-xs text-red-500 mt-2">
                    GPS: {item.suspectedLocation.lat.toFixed(4)}, {item.suspectedLocation.lng.toFixed(4)}
                  </p>
                </div>
                <button className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Infos supplémentaires */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500">Compteurs affectés</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.affectedMeters}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500">Dernière vérification</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {new Date(item.lastCheck).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          {item.status !== 'NORMAL' && (
            <>
              <button className="btn-primary">
                <Navigation className="w-4 h-4" />
                <span>Ouvrir dans Maps</span>
              </button>
              <button onClick={onCreateTicket} className="btn-warning">
                <FileText className="w-4 h-4" />
                <span>Créer ticket d'audit</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReconciliationModule;
