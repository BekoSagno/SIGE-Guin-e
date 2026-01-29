import { useState, useEffect } from 'react';
import { 
  Zap, ZapOff, AlertTriangle, Activity, MapPin, Clock, CheckCircle,
  Send, Wifi, WifiOff, ThermometerSun, Users, RefreshCw, ChevronRight,
  Radio, Server, ArrowRight, X
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';
import { gridService } from '@common/services';

// Données simulées des zones et leurs boîtiers
const MOCK_ZONES = [
  {
    id: 'ZONE-DIXINN',
    name: 'Dixinn',
    transformer: 'TRANS-DIXINN-001',
    loadPercentage: 92,
    temperature: 72,
    status: 'CRITICAL',
    totalMeters: 234,
    onlineMeters: 220,
    heavyLoadsActive: 145,
    estimatedReduction: 32, // % de réduction si délestage
    clients: [
      { id: 'CLI-001', name: 'Mamadou Diallo', type: 'RESIDENTIAL', power: 2.4, heavyLoads: ['AC', 'HEATER'], status: 'online', sheddingStatus: 'NORMAL' },
      { id: 'CLI-002', name: 'Fatoumata Bah', type: 'RESIDENTIAL', power: 1.8, heavyLoads: ['AC'], status: 'online', sheddingStatus: 'NORMAL' },
      { id: 'CLI-003', name: 'Hôpital Dixinn', type: 'CRITICAL', power: 45.0, heavyLoads: [], status: 'online', sheddingStatus: 'PROTECTED' },
      { id: 'CLI-004', name: 'Ibrahima Sow', type: 'RESIDENTIAL', power: 3.2, heavyLoads: ['AC', 'HEATER', 'PUMP'], status: 'offline', sheddingStatus: 'OFFLINE' },
      { id: 'CLI-005', name: 'Centre Commercial', type: 'COMMERCIAL', power: 25.0, heavyLoads: ['AC', 'LIGHTING'], status: 'online', sheddingStatus: 'NORMAL' },
    ],
  },
  {
    id: 'ZONE-RATOMA',
    name: 'Ratoma',
    transformer: 'TRANS-RATOMA-001',
    loadPercentage: 78,
    temperature: 58,
    status: 'WARNING',
    totalMeters: 312,
    onlineMeters: 298,
    heavyLoadsActive: 189,
    estimatedReduction: 28,
    clients: [
      { id: 'CLI-006', name: 'Aissatou Barry', type: 'RESIDENTIAL', power: 1.5, heavyLoads: ['AC'], status: 'online', sheddingStatus: 'NORMAL' },
      { id: 'CLI-007', name: 'Oumar Camara', type: 'RESIDENTIAL', power: 2.1, heavyLoads: ['HEATER'], status: 'online', sheddingStatus: 'NORMAL' },
    ],
  },
  {
    id: 'ZONE-MATOTO',
    name: 'Matoto',
    transformer: 'TRANS-MATOTO-001',
    loadPercentage: 74,
    temperature: 52,
    status: 'WARNING',
    totalMeters: 178,
    onlineMeters: 165,
    heavyLoadsActive: 98,
    estimatedReduction: 25,
    clients: [],
  },
  {
    id: 'ZONE-KALOUM',
    name: 'Kaloum',
    transformer: 'TRANS-KALOUM-001',
    loadPercentage: 66,
    temperature: 45,
    status: 'NORMAL',
    totalMeters: 156,
    onlineMeters: 148,
    heavyLoadsActive: 67,
    estimatedReduction: 20,
    clients: [],
  },
];

// Journal des commandes MQTT
const MOCK_MQTT_LOG = [
  { id: 1, timestamp: new Date(Date.now() - 300000).toISOString(), zone: 'Dixinn', command: 'CMD_REDUCE_LOAD', status: 'DELIVERED', metersAffected: 145 },
  { id: 2, timestamp: new Date(Date.now() - 600000).toISOString(), zone: 'Ratoma', command: 'CMD_RESTORE', status: 'DELIVERED', metersAffected: 189 },
  { id: 3, timestamp: new Date(Date.now() - 900000).toISOString(), zone: 'Matoto', command: 'CMD_REDUCE_LOAD', status: 'PARTIAL', metersAffected: 85 },
];

// Types de relais disponibles
const RELAY_TYPES = [
  { id: 'POWER', label: 'Puissance (Climatiseurs, Chauffe-eau)', icon: Zap, color: 'red', description: 'Coupe les appareils de forte puissance' },
  { id: 'LIGHTS_PLUGS', label: 'Éclairage et Prises', icon: Activity, color: 'yellow', description: 'Coupe l\'éclairage et les prises' },
  { id: 'ESSENTIAL', label: 'Essentiel (Réfrigérateur)', icon: CheckCircle, color: 'green', description: 'Ne JAMAIS couper (services vitaux)' },
];

function SmartLoadShedding() {
  const notify = useNotification();
  const [zones, setZones] = useState(MOCK_ZONES);
  const [selectedZone, setSelectedZone] = useState(null);
  const [mqttLog, setMqttLog] = useState(MOCK_MQTT_LOG);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [loadingZone, setLoadingZone] = useState(null);
  const [showMqttPanel, setShowMqttPanel] = useState(false);
  const [showRelaySelector, setShowRelaySelector] = useState(false);
  const [selectedRelays, setSelectedRelays] = useState(['POWER']); // Par défaut: seulement POWER
  const [pendingAction, setPendingAction] = useState(null); // { zone, action }
  const [zoneRelayStats, setZoneRelayStats] = useState({}); // { zoneId: { relayStats, summary } }

  // Charger les statistiques des relais pour chaque zone
  useEffect(() => {
    const loadRelayStats = async () => {
      for (const zone of zones) {
        try {
          const stats = await gridService.getZoneRelays(zone.id);
          setZoneRelayStats(prev => ({ ...prev, [zone.id]: stats }));
        } catch (error) {
          console.error(`Erreur chargement stats relais pour ${zone.id}:`, error);
        }
      }
    };
    loadRelayStats();
  }, [zones.length]);

  // Simuler les mises à jour temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setZones(prev => prev.map(zone => ({
        ...zone,
        loadPercentage: Math.max(50, Math.min(98, zone.loadPercentage + (Math.random() - 0.5) * 5)),
        temperature: Math.max(40, Math.min(80, zone.temperature + (Math.random() - 0.5) * 3)),
        onlineMeters: Math.max(zone.totalMeters - 20, Math.min(zone.totalMeters, zone.onlineMeters + Math.floor((Math.random() - 0.5) * 5))),
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLoadShedding = async (zone, action) => {
    const isActivate = action === 'SHED';
    
    // Si activation, afficher le sélecteur de relais
    if (isActivate) {
      setPendingAction({ zone, action });
      setShowRelaySelector(true);
      return;
    }
    
    // Si restauration, procéder directement
    setConfirmDialog({
      isOpen: true,
      title: `Rétablir l'alimentation sur ${zone.name} ?`,
      message: `Cette action enverra la commande CMD_RESTORE à tous les boîtiers de la zone ${zone.name}.`,
      type: 'info',
      confirmText: 'Rétablir',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setLoadingZone(zone.id);
        await executeLoadShedding(zone, action, null);
        setLoadingZone(null);
      },
    });
  };

  const handleRelaySelectionConfirm = () => {
    if (pendingAction && selectedRelays.length > 0) {
      setShowRelaySelector(false);
      const { zone, action } = pendingAction;
      setPendingAction(null);
      
      setConfirmDialog({
        isOpen: true,
        title: `Activer le délestage sélectif sur ${zone.name} ?`,
        message: `Cette action coupera les relais suivants sur ${zone.onlineMeters} boîtiers IoT :\n\n${selectedRelays.map(r => {
          const relay = RELAY_TYPES.find(rt => rt.id === r);
          return `• ${relay?.label || r}`;
        }).join('\n')}\n\nL'éclairage et les services vitaux resteront actifs.`,
        type: 'warning',
        confirmText: 'Activer délestage',
        onConfirm: async () => {
          setConfirmDialog({ isOpen: false });
          setLoadingZone(zone.id);
          await executeLoadShedding(zone, action, selectedRelays);
          setLoadingZone(null);
        },
      });
    }
  };

  const executeLoadShedding = async (zone, action, targetRelays) => {
    const isActivate = action === 'SHED';
    
    try {
      const commandType = isActivate ? 'SHED_HEAVY_LOADS' : 'RESTORE';
      const result = await gridService.triggerLoadShedding(zone.id, commandType, targetRelays);
      
      notify.success(
        isActivate 
          ? `Délestage activé sur ${zone.name}. ${result.metersAffected} boîtiers affectés.${targetRelays ? ` Relais: ${targetRelays.join(', ')}` : ''}`
          : `Alimentation rétablie sur ${zone.name}`,
        {
          title: isActivate ? '⚡ Délestage Sélectif Actif' : '✅ Mode Normal Rétabli',
          duration: 5000,
        }
      );

      // Mettre à jour la zone
      setZones(prev => prev.map(z => {
        if (z.id === zone.id) {
          return {
            ...z,
            loadPercentage: isActivate ? Math.max(50, z.loadPercentage - z.estimatedReduction) : z.loadPercentage + 15,
            status: isActivate ? 'SHEDDING' : (z.loadPercentage > 85 ? 'CRITICAL' : z.loadPercentage > 70 ? 'WARNING' : 'NORMAL'),
          };
        }
        return z;
      }));

      // Ajouter au log MQTT
      const newLogEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        zone: zone.name,
        command: isActivate ? 'CMD_REDUCE_LOAD' : 'CMD_RESTORE',
        status: 'DELIVERED',
        metersAffected: result.metersAffected,
        targetRelays: targetRelays || 'ALL',
      };
      setMqttLog(prev => [newLogEntry, ...prev]);
    } catch (error) {
      console.error('Erreur délestage:', error);
      notify.error(error.response?.data?.error || 'Erreur lors du délestage', {
        title: 'Échec du délestage',
      });
    } finally {
      setLoadingZone(null);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'CRITICAL':
        return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-600', badge: 'badge-danger' };
      case 'WARNING':
        return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500', text: 'text-amber-600', badge: 'badge-warning' };
      case 'SHEDDING':
        return { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-600', badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200' };
      default:
        return { bg: 'bg-success-50 dark:bg-success-900/20', border: 'border-success-500', text: 'text-success-600', badge: 'badge-success' };
    }
  };

  const criticalZones = zones.filter(z => z.status === 'CRITICAL');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Délestage Intelligent IoT
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Contrôle chirurgical via MQTT - Shedding 2.0
          </p>
        </div>
        
        <button
          onClick={() => setShowMqttPanel(!showMqttPanel)}
          className="btn-secondary"
        >
          <Server className="w-5 h-5" />
          <span>Journal MQTT</span>
          <span className="ml-1 px-2 py-0.5 bg-primary-500 text-white rounded-full text-xs">
            {mqttLog.length}
          </span>
        </button>
      </div>

      {/* Alerte critique */}
      {criticalZones.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 animate-bounce" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-200">
                {criticalZones.length} zone(s) en surcharge critique !
              </h3>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                Délestage sélectif recommandé pour éviter la coupure générale.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {criticalZones.map(zone => (
                  <span key={zone.id} className="badge-danger">
                    {zone.name}: {zone.loadPercentage.toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow technique */}
      <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500">
        <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-3">
          Workflow Technique MQTT
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-gray-700 dark:text-gray-300">Surcharge détectée</span>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-500" />
          <div className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg">
            <Radio className="w-4 h-4 text-purple-500" />
            <span className="text-gray-700 dark:text-gray-300">CMD via Mosquitto</span>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-500" />
          <div className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-gray-700 dark:text-gray-300">Relais secondaire ouvert</span>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-500" />
          <div className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-4 h-4 text-success-500" />
            <span className="text-gray-700 dark:text-gray-300">Charge réduite de 30%</span>
          </div>
        </div>
      </div>

      {/* Zones de contrôle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {zones.map((zone) => {
          const config = getStatusConfig(zone.status);
          const isLoading = loadingZone === zone.id;

          return (
            <div
              key={zone.id}
              className={`card border-l-4 ${config.border} ${config.bg} transition-all hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{zone.name}</h4>
                    <span className={`badge ${config.badge}`}>
                      {zone.status === 'SHEDDING' ? 'DÉLESTAGE ACTIF' : zone.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{zone.transformer}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  zone.status === 'CRITICAL' ? 'bg-red-500' :
                  zone.status === 'WARNING' ? 'bg-amber-500' :
                  zone.status === 'SHEDDING' ? 'bg-purple-500' : 'bg-success-500'
                }`}>
                  {zone.status === 'SHEDDING' ? (
                    <ZapOff className="w-6 h-6 text-white" />
                  ) : (
                    <Zap className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <p className={`text-xl font-bold ${config.text}`}>{zone.loadPercentage.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">Charge</p>
                </div>
                <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <p className={`text-xl font-bold ${zone.temperature > 65 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {zone.temperature}°C
                  </p>
                  <p className="text-xs text-gray-500">Temp.</p>
                </div>
                <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{zone.onlineMeters}</p>
                  <p className="text-xs text-gray-500">En ligne</p>
                </div>
              </div>

              {/* Barre de charge */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Charge du transformateur</span>
                  <span className={config.text}>{zone.loadPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      zone.status === 'CRITICAL' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      zone.status === 'WARNING' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                      zone.status === 'SHEDDING' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                      'bg-gradient-to-r from-success-400 to-success-600'
                    }`}
                    style={{ width: `${Math.min(zone.loadPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span>
                  <span className="text-amber-500">70%</span>
                  <span className="text-red-500">85%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Statistiques des relais */}
              {zoneRelayStats[zone.id] && (
                <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">État des Relais Smart Panel :</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(zoneRelayStats[zone.id].relayStats).map(([type, stats]) => {
                      const relayType = RELAY_TYPES.find(r => r.id === type);
                      if (!relayType) return null;
                      const Icon = relayType.icon;
                      const enabledPercent = stats.total > 0 ? (stats.enabled / stats.total * 100).toFixed(0) : 0;
                      return (
                        <div key={type} className="text-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded">
                          <Icon className={`w-4 h-4 mx-auto mb-1 ${stats.enabled > 0 ? 'text-success-500' : 'text-gray-400'}`} />
                          <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{enabledPercent}%</p>
                          <p className="text-[10px] text-gray-500">{stats.enabled}/{stats.total}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info délestage */}
              <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Charges lourdes actives</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{zone.heavyLoadsActive}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Réduction estimée</span>
                  <span className="font-semibold text-success-600">-{zone.estimatedReduction}%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {zone.status === 'SHEDDING' ? (
                  <button
                    onClick={() => handleLoadShedding(zone, 'RESTORE')}
                    disabled={isLoading}
                    className="flex-1 btn-success text-sm"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>Rétablir</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleLoadShedding(zone, 'SHED')}
                    disabled={isLoading || zone.status === 'NORMAL'}
                    className="flex-1 btn-warning text-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ZapOff className="w-4 h-4" />
                    )}
                    <span>Délester</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedZone(zone)}
                  className="btn-secondary text-sm px-3"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel MQTT Log */}
      {showMqttPanel && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Server className="w-5 h-5 text-purple-500" />
              <span>Journal des commandes MQTT</span>
            </h3>
            <span className="badge-info">{mqttLog.length} commandes</span>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {mqttLog.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.status === 'DELIVERED' ? 'bg-success-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {log.command}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.zone} • {log.metersAffected} boîtiers
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge ${log.status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`}>
                    {log.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal détails zone */}
      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
          onLoadShedding={(action) => handleLoadShedding(selectedZone, action)}
        />
      )}

      {/* Sélecteur de relais */}
      {showRelaySelector && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRelaySelector(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in-scale"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Sélectionner les Relais à Couper
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Zone: {pendingAction.zone.name} • {pendingAction.zone.onlineMeters} boîtiers IoT
              </p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Choisissez quels circuits électriques couper lors du délestage :
              </p>

              {RELAY_TYPES.map((relayType) => {
                const Icon = relayType.icon;
                const isSelected = selectedRelays.includes(relayType.id);
                const isEssential = relayType.id === 'ESSENTIAL';

                return (
                  <div
                    key={relayType.id}
                    onClick={() => {
                      if (isEssential) {
                        notify.warning('Le relais ESSENTIEL ne peut pas être coupé (services vitaux)', {
                          title: 'Relais protégé',
                        });
                        return;
                      }
                      if (isSelected) {
                        setSelectedRelays(prev => prev.filter(r => r !== relayType.id));
                      } else {
                        setSelectedRelays(prev => [...prev, relayType.id]);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : isEssential
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : isEssential
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">
                            {relayType.label}
                          </h4>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-primary-500" />
                          )}
                          {isEssential && (
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                              PROTÉGÉ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {relayType.description}
                        </p>
                        {zoneRelayStats[pendingAction.zone.id]?.relayStats[relayType.id] && (
                          <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            {zoneRelayStats[pendingAction.zone.id].relayStats[relayType.id].enabled} relais actifs sur {zoneRelayStats[pendingAction.zone.id].relayStats[relayType.id].total}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {selectedRelays.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Veuillez sélectionner au moins un relais à couper</span>
                </p>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRelaySelector(false);
                  setPendingAction(null);
                  setSelectedRelays(['POWER']); // Réinitialiser
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleRelaySelectionConfirm}
                disabled={selectedRelays.length === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer ({selectedRelays.length} relais)
              </button>
            </div>
          </div>
        </div>
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

function ZoneDetailModal({ zone, onClose, onLoadShedding }) {
  const config = zone.status === 'CRITICAL' ? 'red' : zone.status === 'WARNING' ? 'amber' : zone.status === 'SHEDDING' ? 'purple' : 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 bg-gradient-to-r from-${config}-500 to-${config}-600`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                {zone.status === 'SHEDDING' ? (
                  <ZapOff className="w-6 h-6 text-white" />
                ) : (
                  <Zap className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{zone.name}</h3>
                <p className="text-white/80">{zone.transformer}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-white/20 text-white">
              {zone.status}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Liste des clients */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Boîtiers IoT connectés ({zone.clients.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {zone.clients.map((client) => (
                <div 
                  key={client.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    client.sheddingStatus === 'PROTECTED' ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200' :
                    client.sheddingStatus === 'OFFLINE' ? 'bg-gray-100 dark:bg-gray-700/50' :
                    'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      client.status === 'online' ? 'bg-success-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {client.name}
                        {client.type === 'CRITICAL' && (
                          <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-0.5 rounded">PROTÉGÉ</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {client.id} • {client.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{client.power} kW</p>
                    <p className="text-xs text-gray-500">
                      {client.heavyLoads.length > 0 ? client.heavyLoads.join(', ') : 'Aucune charge lourde'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Légende */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Priorités de délestage
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Vital (hôpitaux, routeurs) - Jamais coupé</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Confort (TV, chargeurs) - Réduit</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Luxe (AC, chauffe-eau) - Coupé en premier</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          {zone.status === 'SHEDDING' ? (
            <button onClick={() => { onLoadShedding('RESTORE'); onClose(); }} className="btn-success">
              <Zap className="w-4 h-4" />
              <span>Rétablir alimentation</span>
            </button>
          ) : zone.status !== 'NORMAL' && (
            <button onClick={() => { onLoadShedding('SHED'); onClose(); }} className="btn-warning">
              <ZapOff className="w-4 h-4" />
              <span>Activer délestage sélectif</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SmartLoadShedding;
