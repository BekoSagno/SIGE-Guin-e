import { useState, useEffect } from 'react';
import { apiClient } from '@common/services';
import { Zap, Power, Lightbulb, Settings, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useNotification } from './Notification';

function SmartPanel({ homeId, userRole = 'ADMIN', permissions = null }) {
  const notify = useNotification();
  const [relays, setRelays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meterId, setMeterId] = useState(null);

  useEffect(() => {
    if (homeId) {
      loadMeterAndRelays();
    }
  }, [homeId]);

  const loadMeterAndRelays = async () => {
    try {
      setLoading(true);
      
      // Récupérer le foyer avec ses compteurs
      const homeResponse = await apiClient.get(`/homes/${homeId}`);
      const home = homeResponse.data.home;

      if (home.meters && home.meters.length > 0) {
        const meter = home.meters[0];
        setMeterId(meter.id);

        // Récupérer les relais
        const relaysResponse = await apiClient.get(`/energy/meters/${meter.id}/relays`);
        setRelays(relaysResponse.data.relays || []);
      } else {
        setRelays([]);
      }
    } catch (error) {
      console.error('Erreur chargement Smart Panel:', error);
      notify.error('Erreur lors du chargement du Smart Panel', {
        title: 'Erreur',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRelayControl = async (relayId, action) => {
    if (!meterId) return;

    // Mise à jour optimiste de l'état local
    const newEnabledState = action === 'enable';
    setRelays(prevRelays => 
      prevRelays.map(relay => 
        relay.id === relayId 
          ? { ...relay, isEnabled: newEnabledState }
          : relay
      )
    );

    try {
      const response = await apiClient.post(`/energy/meters/${meterId}/relays/${relayId}/control`, {
        action,
      });

      // Si le backend retourne le relais mis à jour, l'utiliser directement
      if (response.data.relay) {
        const updatedRelay = response.data.relay;
        setRelays(prevRelays => 
          prevRelays.map(relay => 
            relay.id === relayId 
              ? { ...relay, isEnabled: updatedRelay.isEnabled }
              : relay
          )
        );
        console.log('✅ Relais mis à jour depuis la réponse serveur:', updatedRelay.isEnabled);
      }

      notify.success(`Relais ${action === 'enable' ? 'activé' : 'désactivé'} avec succès`, {
        title: '✅ Commande envoyée',
        duration: 3000,
      });

      // Recharger les relais pour synchroniser avec le serveur (avec un délai plus long)
      setTimeout(() => {
        loadMeterAndRelays();
      }, 1000);
    } catch (error) {
      console.error('Erreur contrôle relais:', error);
      
      // Annuler la mise à jour optimiste en cas d'erreur
      setRelays(prevRelays => 
        prevRelays.map(relay => 
          relay.id === relayId 
            ? { ...relay, isEnabled: !newEnabledState }
            : relay
        )
      );

      notify.error(error.response?.data?.error || 'Erreur lors du contrôle du relais', {
        title: 'Échec',
      });
    }
  };

  const getCircuitIcon = (circuitType) => {
    switch (circuitType) {
      case 'LIGHTS_PLUGS':
        return Lightbulb;
      case 'POWER':
        return Power;
      case 'ESSENTIAL':
        return Zap;
      default:
        return Settings;
    }
  };

  const getCircuitLabel = (circuitType) => {
    switch (circuitType) {
      case 'LIGHTS_PLUGS':
        return 'Éclairage et Prises';
      case 'POWER':
        return 'Puissance (Climatiseurs, Chauffe-eau)';
      case 'ESSENTIAL':
        return 'Essentiel (Réfrigérateur)';
      default:
        return circuitType;
    }
  };

  const getCircuitColor = (circuitType) => {
    switch (circuitType) {
      case 'LIGHTS_PLUGS':
        return 'from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30';
      case 'POWER':
        return 'from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30';
      case 'ESSENTIAL':
        return 'from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30';
      default:
        return 'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-800/30';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Chargement du Smart Panel...
        </div>
      </div>
    );
  }

  if (!meterId) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Aucun compteur IoT connecté
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connectez un kit IoT pour activer le Smart Panel
          </p>
        </div>
      </div>
    );
  }

  if (relays.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Aucun relais configuré
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Les relais seront créés automatiquement lors de la configuration du compteur
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Smart Panel</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestion des circuits électriques (Relais internes)
            </p>
          </div>
        </div>

        {/* Liste des relais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relays.map((relay, index) => {
            const Icon = getCircuitIcon(relay.circuitType);
            const isEnabled = relay.isEnabled;
            const isActive = relay.isActive;
            const usagePercent = relay.maxPower > 0 
              ? Math.min(100, (relay.currentPower / relay.maxPower) * 100) 
              : 0;

            return (
              <div
                key={relay.id}
                className={`p-5 bg-white dark:bg-gray-800 rounded-xl border ${
                  isEnabled ? 'border-success-300 dark:border-success-700 shadow-md' : 'border-gray-200 dark:border-gray-700'
                } hover:shadow-lg transition-all duration-300 animate-slide-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* En-tête du relais */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Relais
                    </h4>
                  </div>
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                </div>

                {/* Label du circuit */}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  {relay.label || getCircuitLabel(relay.circuitType)}
                </p>

                {/* Statistiques */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Puissance actuelle</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {relay.currentPower.toFixed(0)} W
                    </span>
                  </div>
                  {relay.maxPower && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Maximum</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {relay.maxPower.toFixed(0)} W
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>{relay.deviceCount || 0} appareil(s)</span>
                    <span>{usagePercent.toFixed(0)}% utilisé</span>
                  </div>
                </div>

                {/* Bouton de contrôle */}
                <button
                  onClick={() => handleRelayControl(relay.id, isEnabled ? 'disable' : 'enable')}
                  disabled={!isActive || (relay.circuitType === 'ESSENTIAL' && userRole !== 'ADMIN_ETAT')}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    isEnabled
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-success-500 hover:bg-success-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isEnabled ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Note explicative */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Smart Panel :</strong> Les relais internes du boîtier IoT permettent de gérer sélectivement 
            les circuits électriques. En cas de délestage, seul le relais "Puissance" peut être coupé, 
            préservant l'éclairage et les appareils essentiels.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SmartPanel;
