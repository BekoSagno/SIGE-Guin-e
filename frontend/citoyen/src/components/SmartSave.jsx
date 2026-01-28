import { useState, useEffect } from 'react';
import { energyService } from '@common/services';
import { 
  Snowflake, Power, TrendingDown, Zap, CheckCircle, AlertCircle, 
  Lock, Lightbulb, Tv, Wind, Droplets, Monitor,
  Smartphone, Radio, Gamepad2, Circle, CircleDot, Plus, X
} from 'lucide-react';
import { useNotification } from './Notification';

// Types d'appareils prédéfinis
const DEVICE_TYPES = [
  { value: 'AMPOULE', label: 'Ampoule', icon: 'lightbulb', powerDefault: 60 },
  { value: 'FRIGO', label: 'Réfrigérateur', icon: 'snowflake', powerDefault: 200 },
  { value: 'CLIM', label: 'Climatiseur', icon: 'wind', powerDefault: 1500 },
  { value: 'VENTILATEUR', label: 'Ventilateur', icon: 'wind', powerDefault: 75 },
  { value: 'TV', label: 'Télévision', icon: 'tv', powerDefault: 150 },
  { value: 'CHAUFFE_EAU', label: 'Chauffe-eau', icon: 'droplets', powerDefault: 2000 },
  { value: 'ORDINATEUR', label: 'Ordinateur', icon: 'monitor', powerDefault: 300 },
  { value: 'TELEPHONE', label: 'Chargeur téléphone', icon: 'smartphone', powerDefault: 10 },
  { value: 'RADIO', label: 'Radio', icon: 'radio', powerDefault: 20 },
  { value: 'CONSOLE', label: 'Console de jeux', icon: 'gamepad', powerDefault: 200 },
  { value: 'FER_A_REPASSER', label: 'Fer à repasser', icon: 'zap', powerDefault: 1200 },
  { value: 'MACHINE_A_LAVER', label: 'Machine à laver', icon: 'droplets', powerDefault: 500 },
  { value: 'MICRO_ONDES', label: 'Micro-ondes', icon: 'zap', powerDefault: 1000 },
  { value: 'AUTRE', label: 'Autre appareil', icon: 'zap', powerDefault: 100 },
];

function SmartSave({ homeId, userRole, permissions }) {
  const notify = useNotification();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [controlling, setControlling] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'AMPOULE',
    powerRating: 60,
  });

  useEffect(() => {
    if (homeId) {
      loadDevices();
      const interval = setInterval(loadDevices, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setError('Aucun foyer sélectionné');
    }
  }, [homeId]);

  const loadDevices = async () => {
    try {
      setError(null);
      const response = await energyService.getDevices(homeId);
      setDevices(response.devices || []);
    } catch (error) {
      console.error('Erreur chargement appareils:', error);
      setError('Erreur lors du chargement des appareils');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleControlDevice = async (deviceId, action) => {
    const device = devices.find(d => d.id === deviceId);
    setControlling({ ...controlling, [deviceId]: true });
    try {
      await energyService.controlDevice(deviceId, homeId, action);
      setDevices(devices.map(d => 
        d.id === deviceId ? { ...d, isOn: action === 'on' } : d
      ));
      notify.energy(
        action === 'on' 
          ? `${device?.name || 'Appareil'} allumé` 
          : `${device?.name || 'Appareil'} éteint`,
        { 
          title: action === 'on' ? '⚡ Appareil activé' : '🔌 Appareil désactivé',
          duration: 3000 
        }
      );
      setTimeout(loadDevices, 1000);
    } catch (error) {
      console.error('Erreur contrôle appareil:', error);
      notify.error(error.response?.data?.error || 'Erreur lors du contrôle de l\'appareil');
    } finally {
      setControlling({ ...controlling, [deviceId]: false });
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.name.trim()) {
      notify.warning('Veuillez entrer un nom pour l\'appareil');
      return;
    }

    setAdding(true);
    try {
      await energyService.addDevice(homeId, newDevice.name, newDevice.type, newDevice.powerRating);
      setShowAddModal(false);
      setNewDevice({ name: '', type: 'AMPOULE', powerRating: 60 });
      loadDevices();
      notify.success(`${newDevice.name} ajouté avec succès !`, {
        title: '✅ Nouvel appareil',
        duration: 4000,
      });
    } catch (error) {
      console.error('Erreur ajout appareil:', error);
      notify.error(error.response?.data?.error || 'Erreur lors de l\'ajout de l\'appareil');
    } finally {
      setAdding(false);
    }
  };

  const handleTypeChange = (type) => {
    const deviceType = DEVICE_TYPES.find(t => t.value === type);
    setNewDevice({
      ...newDevice,
      type,
      powerRating: deviceType?.powerDefault || 100,
    });
  };

  const getDeviceIcon = (type, name) => {
    const typeLower = (type || '').toLowerCase();
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('ampoule') || nameLower.includes('lumière') || typeLower.includes('light') || typeLower.includes('lamp') || typeLower === 'ampoule') {
      return <Lightbulb className="w-6 h-6" />;
    }
    if (nameLower.includes('frigo') || nameLower.includes('réfrigérateur') || typeLower.includes('frigo') || typeLower === 'refrigerator') {
      return <Snowflake className="w-6 h-6" />;
    }
    if (nameLower.includes('climatiseur') || nameLower.includes('ventilateur') || typeLower.includes('clim') || typeLower.includes('ac') || typeLower === 'ventilateur') {
      return <Wind className="w-6 h-6" />;
    }
    if (nameLower.includes('chauffe') || nameLower.includes('eau') || nameLower.includes('machine') || typeLower.includes('water') || typeLower === 'chauffe_eau' || typeLower === 'machine_a_laver') {
      return <Droplets className="w-6 h-6" />;
    }
    if (nameLower.includes('tv') || nameLower.includes('télévision') || typeLower.includes('tv')) {
      return <Tv className="w-6 h-6" />;
    }
    if (nameLower.includes('ordinateur') || nameLower.includes('pc') || typeLower.includes('computer') || typeLower === 'ordinateur') {
      return <Monitor className="w-6 h-6" />;
    }
    if (nameLower.includes('téléphone') || nameLower.includes('phone') || typeLower.includes('phone') || typeLower === 'telephone') {
      return <Smartphone className="w-6 h-6" />;
    }
    if (nameLower.includes('radio') || typeLower.includes('radio')) {
      return <Radio className="w-6 h-6" />;
    }
    if (nameLower.includes('console') || nameLower.includes('game') || typeLower.includes('game') || typeLower === 'console') {
      return <Gamepad2 className="w-6 h-6" />;
    }
    return <Zap className="w-6 h-6" />;
  };

  const getDeviceTypeLabel = (type) => {
    const deviceType = DEVICE_TYPES.find(t => t.value === type?.toUpperCase());
    return deviceType?.label || type || 'Appareil';
  };

  // Fonction pour corriger les noms mal encodés
  const formatDeviceName = (name) => {
    if (!name) return 'Appareil';
    // Corriger les problèmes d'encodage courants
    return name
      .replace(/R\?\?frig\?\?rateur/gi, 'Réfrigérateur')
      .replace(/Refrigerateur/gi, 'Réfrigérateur')
      .replace(/Clim\?\?tiseur/gi, 'Climatiseur')
      .replace(/T\?\?l\?\?vision/gi, 'Télévision')
      .replace(/Chauffe-eau/gi, 'Chauffe-eau')
      .replace(/\?\?/g, 'é');
  };

  const canControl = permissions?.canControlDevices !== false && userRole !== 'CHILD';

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Chargement des appareils...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          <button 
            onClick={loadDevices}
            className="mt-4 btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.isOn).length;
  const totalPower = devices.reduce((sum, d) => sum + (d.isOn ? (d.powerRating || 0) : 0), 0);
  const estimatedCostPerHour = (totalPower / 1000) * 850;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête avec statistiques globales */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Smart Save - Contrôle des Appareils</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gérez tous vos appareils énergivores à distance</p>
            </div>
          </div>
          {canControl && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un appareil</span>
            </button>
          )}
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border-2 border-primary-200 dark:border-primary-800">
            <div className="flex items-center space-x-2 mb-2">
              <Power className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Appareils actifs</span>
            </div>
            <div className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
              {activeDevices} <span className="text-sm font-medium">/{totalDevices}</span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-accent-50 to-accent-100/50 dark:from-accent-900/20 dark:to-accent-800/20 rounded-xl border-2 border-accent-200 dark:border-accent-800">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Puissance totale</span>
            </div>
            <div className="text-2xl font-extrabold text-accent-600 dark:text-accent-400">
              {totalPower.toFixed(0)} <span className="text-sm font-medium">W</span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 rounded-xl border-2 border-success-200 dark:border-success-800">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="w-5 h-5 text-success-600 dark:text-success-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Coût/heure</span>
            </div>
            <div className="text-2xl font-extrabold text-success-600 dark:text-success-400">
              {estimatedCostPerHour.toFixed(0)} <span className="text-sm font-medium">GNF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des appareils */}
      <div className="card">
        {devices.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Aucun appareil enregistré
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Ajoutez vos appareils pour les contrôler à distance et suivre leur consommation
            </p>
            {canControl && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter mon premier appareil</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device, index) => {
              const isControlling = controlling[device.id];
              const deviceTypeLabel = getDeviceTypeLabel(device.type);
              
              return (
                <div
                  key={device.id}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 animate-slide-up ${
                    device.isOn
                      ? 'bg-gradient-to-r from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 border-success-300 dark:border-success-700'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 border-gray-200 dark:border-gray-600'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        device.isOn
                          ? 'bg-success-200 dark:bg-success-800/50 text-success-700 dark:text-success-300'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}>
                        {getDeviceIcon(device.type, device.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            {formatDeviceName(device.name) || deviceTypeLabel}
                          </h4>
                          {device.source === 'NILM' && (
                            <span className="text-xs font-semibold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                              🎯 Détecté par IoT
                            </span>
                          )}
                          {device.source === 'MANUAL' && (
                            <span className="text-xs font-semibold bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 px-2 py-1 rounded-full">
                              📝 Manuel
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            {device.powerRating || 0} W
                          </span>
                          <span className="flex items-center gap-1">
                            {device.isOn ? (
                              <><CircleDot className="w-4 h-4 text-success-500" /> Allumé</>
                            ) : (
                              <><Circle className="w-4 h-4 text-gray-400" /> Éteint</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {device.canControl && canControl ? (
                      <button
                        onClick={() => handleControlDevice(device.id, device.isOn ? 'off' : 'on')}
                        disabled={isControlling}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                          device.isOn
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                            : 'bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        }`}
                      >
                        {isControlling ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>En cours...</span>
                          </>
                        ) : device.isOn ? (
                          <>
                            <Power className="w-5 h-5" />
                            <span>Éteindre</span>
                          </>
                        ) : (
                          <>
                            <Power className="w-5 h-5" />
                            <span>Allumer</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm">Non contrôlable</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal d'ajout d'appareil */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ajouter un appareil</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddDevice} className="p-6 space-y-5">
              {/* Nom de l'appareil */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nom de l'appareil *
                </label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="Ex: Ampoule salon, Frigo cuisine..."
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all"
                  required
                />
              </div>

              {/* Type d'appareil */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type d'appareil *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {DEVICE_TYPES.slice(0, 8).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeChange(type.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                        newDevice.type === type.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {getDeviceIcon(type.value, '')}
                      <span className="text-xs font-medium truncate w-full text-center">{type.label}</span>
                    </button>
                  ))}
                </div>
                <select
                  value={newDevice.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full mt-3 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all"
                >
                  {DEVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Puissance */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Puissance estimée (Watts)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={newDevice.powerRating}
                    onChange={(e) => setNewDevice({ ...newDevice, powerRating: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="10000"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all"
                  />
                  <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">W</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  La puissance aide à estimer la consommation et le coût
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adding || !newDevice.name.trim()}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Ajout en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Ajouter l'appareil</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!canControl && userRole !== 'ADMIN' && (
        <div className="card p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 border-2 border-gray-200 dark:border-gray-600 text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vous n'avez pas les permissions nécessaires pour contrôler les appareils
          </p>
        </div>
      )}
    </div>
  );
}

export default SmartSave;
