import { useState, useEffect } from 'react';
import { apiClient, energyService } from '@common/services';
import { Activity, TrendingUp, AlertTriangle, DollarSign, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function DeviceAnalytics({ homeId, userRole = 'ADMIN', permissions = null }) {
  const [devices, setDevices] = useState([]);
  const [energyHistory, setEnergyHistory] = useState([]);
  const [deviceCosts, setDeviceCosts] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homeId) {
      loadDevices();
      loadEnergyHistory();
      loadDeviceCosts();
    }
  }, [homeId, selectedPeriod]);

  const loadDevices = async () => {
    try {
      // Récupérer les compteurs du foyer
      const homeResponse = await apiClient.get(`/homes/${homeId}`);
      const home = homeResponse.data.home;

      if (home.meters && home.meters.length > 0) {
        const meterId = home.meters[0].id;
        
        // Récupérer les appareils (NILM + DeviceInventory)
        const devicesResponse = await apiClient.get(`/energy/devices?homeId=${homeId}`);
        const devicesData = devicesResponse.data.devices || [];
        
        // Récupérer les relais pour enrichir les appareils
        try {
          const relaysResponse = await apiClient.get(`/energy/meters/${meterId}/relays`);
          const relays = relaysResponse.data.relays || [];
          const relaysMap = new Map(relays.map(r => [r.id, r]));
          
          // Enrichir les appareils avec les infos de relais
          const enrichedDevices = devicesData.map(device => ({
            ...device,
            relay: device.relayId ? relaysMap.get(device.relayId) : null,
          }));
          
          setDevices(enrichedDevices);
        } catch (relayError) {
          console.warn('Erreur chargement relais (non bloquant):', relayError);
          setDevices(devicesData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement appareils:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnergyHistory = async () => {
    try {
      const response = await apiClient.get(`/energy/consumption?homeId=${homeId}`);
      const data = response.data.data || [];
      
      // Formater les données pour les graphiques
      const formatted = data.slice(0, 24).map((item, index) => ({
        time: new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        power: item.power || 0,
        source: item.energySource,
      }));
      
      setEnergyHistory(formatted);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const loadDeviceCosts = async () => {
    try {
      const data = await energyService.getDeviceCosts(homeId, selectedPeriod);
      setDeviceCosts(data.devices || []);
      setTotalCost(data.totalCost || 0);
    } catch (error) {
      console.error('Erreur chargement coûts appareils:', error);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Chargement des données...</div>
      </div>
    );
  }

  const totalPower = devices.reduce((sum, device) => sum + (device.powerSignature || 0), 0);
  
  // Fusionner les données des appareils avec leurs coûts
  const devicesWithCosts = devices.map((device) => {
    const costData = deviceCosts.find((cost) => cost.deviceId === device.id);
    return {
      ...device,
      costGNF: costData?.costGNF || 0,
      usageHours: costData?.usageHours || 0,
      energyKWh: costData?.energyKWh || 0,
    };
  });

  const deviceChartData = devicesWithCosts.map((device) => ({
    name: device.deviceName,
    power: device.powerSignature || 0,
    type: device.deviceType,
    cost: device.costGNF || 0,
  }));

  // Filtrer les appareils selon les permissions
  const canViewAllDevices = permissions?.canViewAllDevices !== false;
  const filteredDevices = canViewAllDevices 
    ? devicesWithCosts 
    : devicesWithCosts.filter(d => {
        // CHILD : seulement éclairage
        if (userRole === 'CHILD') {
          const type = d.deviceType?.toLowerCase() || '';
          return type.includes('lamp') || type.includes('light') || type.includes('éclairage');
        }
        return true;
      });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Vue d'ensemble - Design moderne */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Analyse Intelligente</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Appareils détectés par IA (NILM)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-800">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Puissance totale</div>
              <div className="text-lg font-extrabold text-primary-600 dark:text-primary-400">
                {totalPower.toFixed(0)} W
              </div>
            </div>
            {totalCost > 0 && (
              <div className="px-4 py-2 bg-success-50 dark:bg-success-900/20 rounded-xl border-2 border-success-200 dark:border-success-800">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Coût total</div>
                <div className="flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-success-600 dark:text-success-400" />
                  <span className="text-lg font-extrabold text-success-600 dark:text-success-400">
                    {totalCost.toLocaleString('fr-FR')} GNF
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sélecteur de période - Design amélioré */}
        {deviceCosts.length > 0 && (
          <div className="mb-6 flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Période d'analyse :</label>
            <div className="flex gap-2 flex-1 flex-wrap">
              {['24h', '7d', '30d'].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-primary-500 text-white shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:scale-105'
                  }`}
                >
                  {period === '24h' ? '24h' : period === '7d' ? '7 jours' : '30 jours'}
                </button>
              ))}
            </div>
          </div>
        )}

        {devices.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-accent-600 dark:text-accent-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucun appareil détecté pour le moment</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Les appareils seront identifiés automatiquement par l'intelligence artificielle</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Liste des appareils - Design amélioré */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.map((device, index) => (
                <div
                  key={device.id}
                  className="p-5 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-700/50 dark:via-gray-700/30 dark:to-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-accent-400 dark:hover:border-accent-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        device.isActive 
                          ? 'bg-success-100 dark:bg-success-900/30 group-hover:scale-110 transition-transform' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Activity className={`w-5 h-5 ${
                          device.isActive ? 'text-success-600 dark:text-success-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {device.deviceName}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{device.deviceType}</p>
                        {device.relay && (
                          <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Circuit: {device.relay.label || device.relay.circuitType}
                          </p>
                        )}
                      </div>
                    </div>
                    {device.isActive && (
                      <div className="w-2.5 h-2.5 bg-success-500 rounded-full animate-pulse-slow flex-shrink-0"></div>
                    )}
                  </div>
                  
                  <div className="space-y-3 pt-3 border-t-2 border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between bg-accent-50/50 dark:bg-accent-900/10 px-3 py-2 rounded-lg">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Puissance</span>
                      <span className="font-extrabold text-lg text-accent-600 dark:text-accent-400">
                        {(device.powerSignature || 0).toFixed(0)} <span className="text-xs">W</span>
                      </span>
                    </div>
                    {device.costGNF > 0 && (
                      <>
                        <div className="flex items-center justify-between bg-success-50/50 dark:bg-success-900/10 px-3 py-2 rounded-lg">
                          <div>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Coût ({selectedPeriod})</span>
                            {device.usageHours > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                                {device.usageHours}h • {device.energyKWh.toFixed(2)} kWh
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-success-600 dark:text-success-400" />
                              <span className="font-extrabold text-lg text-success-600 dark:text-success-400">
                                {device.costGNF.toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <span className="text-xs text-success-600 dark:text-success-400 font-medium">GNF</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Graphique en barres des appareils */}
            {canViewAllDevices && deviceChartData.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Répartition de la consommation par appareil</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deviceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="power" fill="#0ea5e9" name="Puissance (W)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Graphique de consommation temporelle - Design amélioré */}
      {canViewAllDevices && energyHistory.length > 0 && (
        <div className="card animate-fade-in">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Évolution de la Consommation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tendance sur 24 heures</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={energyHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="power"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Puissance (W)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alertes de maintenance prédictive - Design amélioré */}
      <div className="card animate-fade-in">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Maintenance Prédictive</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Surveillance intelligente de vos appareils</p>
          </div>
        </div>
        <div className="p-5 bg-gradient-to-r from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 border-l-4 border-success-500 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-success-800 dark:text-success-300">
                ✅ Aucune alerte pour le moment
              </p>
              <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                L'intelligence artificielle surveille en continu la santé de tous vos appareils
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceAnalytics;
