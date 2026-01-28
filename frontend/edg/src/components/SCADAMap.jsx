import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Zap, Activity, AlertTriangle, ThermometerSun, Users, 
  ChevronRight, X, RefreshCw, Wifi, WifiOff, MapPin,
  TrendingUp, TrendingDown, Clock, Shield
} from 'lucide-react';
import { useNotification } from './Notification';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes personnalisées pour les transformateurs selon leur statut
const createTransformerIcon = (status) => {
  const colors = {
    NORMAL: { bg: '#22c55e', border: '#16a34a' },
    WARNING: { bg: '#f59e0b', border: '#d97706' },
    CRITICAL: { bg: '#ef4444', border: '#dc2626' },
  };
  const color = colors[status] || colors.NORMAL;
  
  return L.divIcon({
    className: 'custom-transformer-icon',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color.bg};
        border: 3px solid ${color.border};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: ${status === 'CRITICAL' ? 'pulse 1s infinite' : 'none'};
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Données simulées des transformateurs en Guinée (Conakry et environs)
const MOCK_TRANSFORMERS = [
  {
    id: 'TRANS-KALOUM-001',
    name: 'Poste Source Kaloum',
    zone: 'Kaloum',
    lat: 9.5092,
    lng: -13.7122,
    capacity: 630, // kVA
    currentLoad: 420,
    loadPercentage: 66.7,
    temperature: 45,
    status: 'NORMAL',
    connectedMeters: 156,
    onlineMeters: 148,
    efficiency: 94.2,
    lastMaintenance: '2024-10-15',
    predictedFailure: null,
  },
  {
    id: 'TRANS-DIXINN-001',
    name: 'Poste Source Dixinn',
    zone: 'Dixinn',
    lat: 9.5350,
    lng: -13.6800,
    capacity: 800,
    currentLoad: 720,
    loadPercentage: 90,
    temperature: 72,
    status: 'CRITICAL',
    connectedMeters: 234,
    onlineMeters: 220,
    efficiency: 87.5,
    lastMaintenance: '2024-06-20',
    predictedFailure: '2025-03-15',
  },
  {
    id: 'TRANS-RATOMA-001',
    name: 'Poste Source Ratoma',
    zone: 'Ratoma',
    lat: 9.5800,
    lng: -13.6200,
    capacity: 1000,
    currentLoad: 780,
    loadPercentage: 78,
    temperature: 58,
    status: 'WARNING',
    connectedMeters: 312,
    onlineMeters: 298,
    efficiency: 91.3,
    lastMaintenance: '2024-08-10',
    predictedFailure: null,
  },
  {
    id: 'TRANS-MATAM-001',
    name: 'Poste Source Matam',
    zone: 'Matam',
    lat: 9.5500,
    lng: -13.6500,
    capacity: 500,
    currentLoad: 310,
    loadPercentage: 62,
    temperature: 42,
    status: 'NORMAL',
    connectedMeters: 89,
    onlineMeters: 85,
    efficiency: 95.1,
    lastMaintenance: '2024-11-01',
    predictedFailure: null,
  },
  {
    id: 'TRANS-MATOTO-001',
    name: 'Poste Source Matoto',
    zone: 'Matoto',
    lat: 9.6100,
    lng: -13.5800,
    capacity: 750,
    currentLoad: 560,
    loadPercentage: 74.7,
    temperature: 52,
    status: 'WARNING',
    connectedMeters: 178,
    onlineMeters: 165,
    efficiency: 89.8,
    lastMaintenance: '2024-07-25',
    predictedFailure: null,
  },
];

// Composant pour centrer la carte sur un transformateur
function FlyToTransformer({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

// Panel de détails d'un transformateur
function TransformerDetailPanel({ transformer, onClose, onLoadShedding }) {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingAction, setLoadingAction] = useState(false);

  // Simuler des boîtiers IoT connectés
  const connectedDevices = [
    { id: 'IOT-001', client: 'Mamadou Diallo', power: 2.4, status: 'online' },
    { id: 'IOT-002', client: 'Fatoumata Bah', power: 1.8, status: 'online' },
    { id: 'IOT-003', client: 'Ibrahima Sow', power: 3.2, status: 'offline' },
    { id: 'IOT-004', client: 'Aissatou Barry', power: 1.5, status: 'online' },
    { id: 'IOT-005', client: 'Oumar Camara', power: 2.1, status: 'online' },
  ];

  const handleLoadShedding = async () => {
    setLoadingAction(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    notify.grid(`Délestage sélectif activé sur ${transformer.name}`, {
      title: '⚡ Commande MQTT envoyée',
      duration: 5000,
    });
    setLoadingAction(false);
    onLoadShedding?.(transformer);
  };

  const getStatusColor = (status) => {
    if (status === 'CRITICAL') return 'text-red-500';
    if (status === 'WARNING') return 'text-amber-500';
    return 'text-success-500';
  };

  const getStatusBg = (status) => {
    if (status === 'CRITICAL') return 'bg-red-100 dark:bg-red-900/30';
    if (status === 'WARNING') return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-success-100 dark:bg-success-900/30';
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-[1000] flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className={`p-4 ${getStatusBg(transformer.status)} border-b border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              transformer.status === 'CRITICAL' ? 'bg-red-500' :
              transformer.status === 'WARNING' ? 'bg-amber-500' : 'bg-success-500'
            }`}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">{transformer.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{transformer.zone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['overview', 'devices', 'alerts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Vue générale' : tab === 'devices' ? 'Boîtiers IoT' : 'Alertes'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Stats principales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-2 mb-1">
                  <Activity className="w-4 h-4 text-primary-500" />
                  <span className="text-xs text-gray-500">Charge</span>
                </div>
                <p className={`text-xl font-bold ${getStatusColor(transformer.status)}`}>
                  {transformer.loadPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {transformer.currentLoad} / {transformer.capacity} kVA
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-2 mb-1">
                  <ThermometerSun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-gray-500">Température</span>
                </div>
                <p className={`text-xl font-bold ${transformer.temperature > 65 ? 'text-red-500' : transformer.temperature > 50 ? 'text-amber-500' : 'text-success-500'}`}>
                  {transformer.temperature}°C
                </p>
                <p className="text-xs text-gray-500">
                  {transformer.temperature > 65 ? 'Critique' : transformer.temperature > 50 ? 'Élevée' : 'Normal'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="w-4 h-4 text-primary-500" />
                  <span className="text-xs text-gray-500">Compteurs</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {transformer.onlineMeters}
                </p>
                <p className="text-xs text-gray-500">
                  / {transformer.connectedMeters} connectés
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-success-500" />
                  <span className="text-xs text-gray-500">Rendement</span>
                </div>
                <p className={`text-xl font-bold ${transformer.efficiency > 90 ? 'text-success-500' : 'text-amber-500'}`}>
                  {transformer.efficiency}%
                </p>
                <p className="text-xs text-gray-500">
                  {transformer.efficiency > 90 ? 'Optimal' : 'À surveiller'}
                </p>
              </div>
            </div>

            {/* Barre de charge */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Charge actuelle</span>
                <span className={`font-bold ${getStatusColor(transformer.status)}`}>
                  {transformer.loadPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    transformer.status === 'CRITICAL' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                    transformer.status === 'WARNING' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                    'bg-gradient-to-r from-success-400 to-success-600'
                  }`}
                  style={{ width: `${Math.min(transformer.loadPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="text-amber-500">70%</span>
                <span className="text-red-500">85%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Maintenance prédictive */}
            {transformer.predictedFailure && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200">Maintenance Prédictive</h4>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Panne probable estimée : <strong>{transformer.predictedFailure}</strong>
                    </p>
                    <p className="text-xs text-red-500 mt-2">
                      Recommandation : Planifier une intervention préventive
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dernière maintenance */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Dernière maintenance</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {transformer.lastMaintenance}
              </span>
            </div>
          </>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Boîtiers IoT connectés
              </h4>
              <span className="badge-info">{connectedDevices.length} appareils</span>
            </div>
            
            {connectedDevices.map((device) => (
              <div 
                key={device.id}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-success-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{device.client}</p>
                    <p className="text-xs text-gray-500">{device.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{device.power} kW</p>
                  <p className={`text-xs ${device.status === 'online' ? 'text-success-500' : 'text-red-500'}`}>
                    {device.status === 'online' ? 'En ligne' : 'Hors ligne'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {transformer.status === 'CRITICAL' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200">Surcharge Critique</h4>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      La charge dépasse 85% de la capacité. Délestage recommandé.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {transformer.temperature > 65 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-xl">
                <div className="flex items-start space-x-3">
                  <ThermometerSun className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Température Élevée</h4>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Température de {transformer.temperature}°C détectée. Surveillance requise.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {transformer.status === 'NORMAL' && transformer.temperature <= 50 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-success-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Aucune alerte active</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {transformer.status !== 'NORMAL' && (
          <button
            onClick={handleLoadShedding}
            disabled={loadingAction}
            className="w-full btn-warning text-sm"
          >
            {loadingAction ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>{loadingAction ? 'Envoi commande...' : 'Activer Délestage Sélectif'}</span>
          </button>
        )}
        <button className="w-full btn-secondary text-sm">
          <Activity className="w-4 h-4" />
          <span>Voir historique complet</span>
        </button>
      </div>
    </div>
  );
}

// Composant principal de la carte SCADA
function SCADAMap({ stats }) {
  const notify = useNotification();
  const [transformers, setTransformers] = useState(MOCK_TRANSFORMERS);
  const [selectedTransformer, setSelectedTransformer] = useState(null);
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Centre de la carte sur Conakry
  const conakryCenter = [9.5370, -13.6785];

  // Simuler la mise à jour temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setTransformers(prev => prev.map(t => ({
        ...t,
        currentLoad: Math.max(100, Math.min(t.capacity * 0.95, t.currentLoad + (Math.random() - 0.5) * 50)),
        loadPercentage: Math.max(10, Math.min(95, t.loadPercentage + (Math.random() - 0.5) * 5)),
        temperature: Math.max(35, Math.min(80, t.temperature + (Math.random() - 0.5) * 3)),
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTransformerClick = (transformer) => {
    setSelectedTransformer(transformer);
    setFlyToPosition([transformer.lat, transformer.lng]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    notify.success('Données cartographiques actualisées', { title: '🗺️ Carte SCADA' });
  };

  const filteredTransformers = filterStatus === 'all' 
    ? transformers 
    : transformers.filter(t => t.status === filterStatus);

  const statusCounts = {
    all: transformers.length,
    NORMAL: transformers.filter(t => t.status === 'NORMAL').length,
    WARNING: transformers.filter(t => t.status === 'WARNING').length,
    CRITICAL: transformers.filter(t => t.status === 'CRITICAL').length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Cartographie SCADA 2.0
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Supervision temps réel des postes sources
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtres de statut */}
          {['all', 'NORMAL', 'WARNING', 'CRITICAL'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1 ${
                filterStatus === status
                  ? status === 'CRITICAL' ? 'bg-red-500 text-white' :
                    status === 'WARNING' ? 'bg-amber-500 text-white' :
                    status === 'NORMAL' ? 'bg-success-500 text-white' :
                    'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span>{status === 'all' ? 'Tous' : status}</span>
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {statusCounts[status]}
              </span>
            </button>
          ))}
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-success-500 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Normal (&lt;70%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Alerte (70-85%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Critique (&gt;85%)</span>
        </div>
      </div>

      {/* Carte */}
      <div className="relative h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-xl border-2 border-gray-200 dark:border-gray-700">
        <MapContainer
          center={conakryCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <FlyToTransformer position={flyToPosition} />
          
          {filteredTransformers.map((transformer) => (
            <Marker
              key={transformer.id}
              position={[transformer.lat, transformer.lng]}
              icon={createTransformerIcon(transformer.status)}
              eventHandlers={{
                click: () => handleTransformerClick(transformer),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-bold text-gray-900">{transformer.name}</h4>
                  <p className="text-sm text-gray-600">{transformer.zone}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Charge: <strong className={
                      transformer.status === 'CRITICAL' ? 'text-red-500' :
                      transformer.status === 'WARNING' ? 'text-amber-500' : 'text-success-500'
                    }>{transformer.loadPercentage.toFixed(1)}%</strong></p>
                    <p>Compteurs: <strong>{transformer.onlineMeters}</strong></p>
                  </div>
                  <button
                    onClick={() => handleTransformerClick(transformer)}
                    className="mt-2 w-full py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Voir détails
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Panel de détails */}
        {selectedTransformer && (
          <TransformerDetailPanel
            transformer={selectedTransformer}
            onClose={() => setSelectedTransformer(null)}
            onLoadShedding={(t) => {
              notify.success(`Délestage activé sur ${t.name}`);
            }}
          />
        )}
      </div>

      {/* Liste des transformateurs (version mobile/compacte) */}
      <div className="lg:hidden space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Postes Sources ({filteredTransformers.length})
        </h3>
        {filteredTransformers.map((transformer) => (
          <div
            key={transformer.id}
            onClick={() => handleTransformerClick(transformer)}
            className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
              transformer.status === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' :
              transformer.status === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500' :
              'bg-success-50 dark:bg-success-900/20 border-l-4 border-success-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{transformer.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{transformer.zone}</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${
                  transformer.status === 'CRITICAL' ? 'text-red-500' :
                  transformer.status === 'WARNING' ? 'text-amber-500' : 'text-success-500'
                }`}>
                  {transformer.loadPercentage.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">{transformer.onlineMeters} compteurs</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SCADAMap;
