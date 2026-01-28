import { useState, useEffect } from 'react';
import { economyModeService } from '@common/services';
import { 
  Battery, BatteryLow, BatteryCharging, Zap, ZapOff, Settings, 
  TrendingDown, TrendingUp, Sun, Moon, Snowflake, Flame,
  AlertTriangle, CheckCircle, Info, ChevronRight, Clock,
  Lightbulb, Tv, Wind, ThermometerSun, BarChart3, Shield,
  Sparkles, Target, Award, Calendar, ArrowRight
} from 'lucide-react';
import { useNotification } from './Notification';

// Niveaux de priorité avec couleurs et descriptions
const PRIORITY_LEVELS = {
  VITAL: { 
    label: 'Vital', 
    color: 'success', 
    icon: Shield,
    description: 'Maintenu en priorité absolue',
    examples: 'Éclairage, routeur, ventilateur de chambre'
  },
  COMFORT: { 
    label: 'Confort', 
    color: 'primary', 
    icon: Lightbulb,
    description: 'Réduit après 22h si mode nuit actif',
    examples: 'Télévision, chargeurs, radio'
  },
  LUXURY: { 
    label: 'Luxe', 
    color: 'accent', 
    icon: Sparkles,
    description: 'Coupé ou limité en mode économie',
    examples: 'Climatisation, chauffe-eau, fer à repasser'
  },
};

function EconomyMode({ homeId, homeData, userRole, permissions }) {
  const notify = useNotification();
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // État local pour les modifications de paramètres
  const [localSettings, setLocalSettings] = useState({
    budgetThreshold: 10000,
    triggerType: 'MANUAL',
    thermalRest: { enabled: true, durationMinutes: 15 },
    sourceOptimization: { enabled: true, solarPriority: true, edgMinBatteryPercent: 20 },
    nightMode: { enabled: false, start: '22:00', end: '06:00' },
  });

  useEffect(() => {
    if (homeId) {
      loadData();
    }
  }, [homeId]);

  useEffect(() => {
    if (homeId && selectedPeriod) {
      loadStats();
    }
  }, [homeId, selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, statsData, recsData] = await Promise.all([
        economyModeService.getSettings(homeId),
        economyModeService.getStats(homeId, selectedPeriod),
        economyModeService.getRecommendations(homeId),
      ]);
      
      setSettings(settingsData);
      setStats(statsData);
      setRecommendations(recsData.recommendations || []);
      
      // Mettre à jour les paramètres locaux
      setLocalSettings({
        budgetThreshold: settingsData.budgetThreshold || 10000,
        triggerType: settingsData.triggerType || 'MANUAL',
        thermalRest: settingsData.thermalRest || { enabled: true, durationMinutes: 15 },
        sourceOptimization: settingsData.sourceOptimization || { enabled: true, solarPriority: true, edgMinBatteryPercent: 20 },
        nightMode: settingsData.nightMode || { enabled: false, start: '22:00', end: '06:00' },
      });
    } catch (error) {
      console.error('Erreur chargement mode économie:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await economyModeService.getStats(homeId, selectedPeriod);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const newState = !settings?.isActive;
      await economyModeService.toggle(homeId, newState, localSettings.triggerType);
      setSettings(prev => ({ ...prev, isActive: newState }));
      if (newState) {
        notify.success('Mode Économie activé ! Vos appareils seront optimisés automatiquement.', {
          title: '🌿 Mode Économie Intelligent',
          duration: 5000,
        });
      } else {
        notify.info('Mode Économie désactivé. Consommation normale rétablie.', {
          title: '⚡ Mode Normal',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Erreur toggle:', error);
      notify.error(error.response?.data?.error || 'Erreur lors de la modification');
    } finally {
      setToggling(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await economyModeService.updateSettings(homeId, localSettings);
      setSettings(prev => ({ ...prev, ...localSettings }));
      setShowSettings(false);
      notify.success('Paramètres enregistrés avec succès !', {
        title: '⚙️ Configuration mise à jour',
        duration: 4000,
      });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      notify.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const canModify = userRole !== 'CHILD' && permissions?.canControlDevices !== false;

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-success-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du mode économie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* En-tête avec switch principal - RESPONSIVE */}
      <div className="card overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${settings?.isActive ? 'from-success-500/10 to-success-600/5' : 'from-gray-500/10 to-gray-600/5'} pointer-events-none`}></div>
        
        <div className="relative flex flex-col gap-4 sm:gap-6">
          {/* Titre et icône */}
          <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
              settings?.isActive 
                ? 'bg-gradient-to-br from-success-400 to-success-600 shadow-lg shadow-success-500/30' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {settings?.isActive ? (
                <Battery className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              ) : (
                <BatteryLow className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Mode Économie Intelligent
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                {settings?.isActive 
                  ? '🔋 Actif - Économies en cours...' 
                  : 'Optimisez votre consommation et préservez votre budget'}
              </p>
            </div>
          </div>

          {/* Boutons d'action - responsive */}
          <div className="flex items-center justify-between sm:justify-start space-x-3 sm:space-x-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Paramètres"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {canModify && (
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 transform hover:scale-105 shadow-lg ${
                  settings?.isActive
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    : 'bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700'
                } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {toggling ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>En cours...</span>
                  </span>
                ) : settings?.isActive ? (
                  <span className="flex items-center justify-center space-x-2">
                    <ZapOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Désactiver</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Activer</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Barre de statut */}
        {settings?.isActive && (
          <div className="bg-success-50 dark:bg-success-900/20 px-6 py-3 border-t border-success-200 dark:border-success-800">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2 text-success-700 dark:text-success-300">
                <CheckCircle className="w-4 h-4" />
                <span>Mode économie actif depuis {new Date(settings.updatedAt).toLocaleString('fr-FR')}</span>
              </span>
              <span className="text-success-600 dark:text-success-400 font-semibold">
                +{stats?.daysGained || 0} jours de courant gagnés
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Panneau de paramètres (collapsible) */}
      {showSettings && (
        <div className="card animate-fade-in">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary-500" />
            <span>Configuration du Mode Économie</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Déclenchement automatique */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Déclenchement</h4>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="triggerType"
                    value="MANUAL"
                    checked={localSettings.triggerType === 'MANUAL'}
                    onChange={(e) => setLocalSettings({...localSettings, triggerType: e.target.value})}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Manuel uniquement</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="triggerType"
                    value="AUTO_BUDGET"
                    checked={localSettings.triggerType === 'AUTO_BUDGET'}
                    onChange={(e) => setLocalSettings({...localSettings, triggerType: e.target.value})}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Automatique (seuil budget)</span>
                </label>
              </div>

              {localSettings.triggerType === 'AUTO_BUDGET' && (
                <div className="ml-7">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Seuil d'activation (GNF)
                  </label>
                  <input
                    type="number"
                    value={localSettings.budgetThreshold}
                    onChange={(e) => setLocalSettings({...localSettings, budgetThreshold: parseInt(e.target.value)})}
                    className="input w-full"
                    min="1000"
                    step="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le mode économie s'active automatiquement en dessous de ce solde
                  </p>
                </div>
              )}
            </div>

            {/* Repos thermique */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                <Snowflake className="w-4 h-4 text-blue-500" />
                <span>Repos Thermique</span>
              </h4>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Activer pour frigos/clims</span>
                <button
                  onClick={() => setLocalSettings({
                    ...localSettings, 
                    thermalRest: {...localSettings.thermalRest, enabled: !localSettings.thermalRest.enabled}
                  })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.thermalRest.enabled ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    localSettings.thermalRest.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </label>

              {localSettings.thermalRest.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Durée du repos (minutes)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={localSettings.thermalRest.durationMinutes}
                    onChange={(e) => setLocalSettings({
                      ...localSettings, 
                      thermalRest: {...localSettings.thermalRest, durationMinutes: parseInt(e.target.value)}
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5 min</span>
                    <span className="font-semibold text-primary-600">{localSettings.thermalRest.durationMinutes} min</span>
                    <span>30 min</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mode nuit */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Mode Nuit</span>
              </h4>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Limiter appareils de confort</span>
                <button
                  onClick={() => setLocalSettings({
                    ...localSettings, 
                    nightMode: {...localSettings.nightMode, enabled: !localSettings.nightMode.enabled}
                  })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.nightMode.enabled ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    localSettings.nightMode.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </label>

              {localSettings.nightMode.enabled && (
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Début</label>
                    <input
                      type="time"
                      value={localSettings.nightMode.start}
                      onChange={(e) => setLocalSettings({
                        ...localSettings, 
                        nightMode: {...localSettings.nightMode, start: e.target.value}
                      })}
                      className="input w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Fin</label>
                    <input
                      type="time"
                      value={localSettings.nightMode.end}
                      onChange={(e) => setLocalSettings({
                        ...localSettings, 
                        nightMode: {...localSettings.nightMode, end: e.target.value}
                      })}
                      className="input w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optimisation source (Hybride) */}
            {homeData?.typeEnergie === 'HYBRIDE' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span>Optimisation Source</span>
                </h4>
                
                <label className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Prioriser le solaire</span>
                  <button
                    onClick={() => setLocalSettings({
                      ...localSettings, 
                      sourceOptimization: {...localSettings.sourceOptimization, enabled: !localSettings.sourceOptimization.enabled}
                    })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      localSettings.sourceOptimization.enabled ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      localSettings.sourceOptimization.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </label>

                {localSettings.sourceOptimization.enabled && (
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Basculer sur EDG si batterie sous (%)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={localSettings.sourceOptimization.edgMinBatteryPercent}
                      onChange={(e) => setLocalSettings({
                        ...localSettings, 
                        sourceOptimization: {...localSettings.sourceOptimization, edgMinBatteryPercent: parseInt(e.target.value)}
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>10%</span>
                      <span className="font-semibold text-primary-600">{localSettings.sourceOptimization.edgMinBatteryPercent}%</span>
                      <span>50%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Boutons sauvegarde */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Statistiques d'économie */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <span>Économies Réalisées</span>
          </h3>
          
          <div className="flex space-x-2">
            {['day', 'week', 'month'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Énergie économisée */}
          <div className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-success-600 dark:text-success-400" />
              <span className="text-sm text-success-700 dark:text-success-300">Énergie économisée</span>
            </div>
            <p className="text-2xl font-bold text-success-800 dark:text-success-200">
              {((stats?.totalEnergySavedKWh || 0)).toFixed(2)} <span className="text-sm font-normal">kWh</span>
            </p>
          </div>

          {/* Argent économisé */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm text-primary-700 dark:text-primary-300">Argent économisé</span>
            </div>
            <p className="text-2xl font-bold text-primary-800 dark:text-primary-200">
              {(stats?.totalCostSavedGNF || 0).toLocaleString()} <span className="text-sm font-normal">GNF</span>
            </p>
          </div>

          {/* Jours gagnés */}
          <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              <span className="text-sm text-accent-700 dark:text-accent-300">Jours gagnés</span>
            </div>
            <p className="text-2xl font-bold text-accent-800 dark:text-accent-200">
              +{stats?.daysGained || 0} <span className="text-sm font-normal">jours</span>
            </p>
          </div>

          {/* Actions effectuées */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Actions</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {stats?.actions?.total || 0}
            </p>
          </div>
        </div>

        {/* Répartition des économies */}
        {stats?.breakdown && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Répartition des économies</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Snowflake className="w-4 h-4 text-blue-500" />
                  <span>Repos thermique</span>
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{stats.breakdown.thermalRest.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.breakdown.thermalRest.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Arbitrage prioritaire</span>
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{stats.breakdown.priorityArbitrage.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.breakdown.priorityArbitrage.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span>Optimisation source</span>
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{stats.breakdown.sourceOptimization.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.breakdown.sourceOptimization.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommandations IA */}
      {recommendations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-accent-500" />
            <span>Recommandations IA</span>
          </h3>

          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div 
                key={index}
                className={`p-4 rounded-xl border-l-4 ${
                  rec.priority === 'HIGH' 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                    : rec.priority === 'MEDIUM'
                    ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-500'
                    : 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      rec.priority === 'HIGH' 
                        ? 'text-red-800 dark:text-red-200' 
                        : rec.priority === 'MEDIUM'
                        ? 'text-accent-800 dark:text-accent-200'
                        : 'text-primary-800 dark:text-primary-200'
                    }`}>
                      {rec.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {rec.description}
                    </p>
                    <span className="inline-block mt-2 text-xs font-semibold bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                      💰 Économie estimée: {rec.estimatedSaving}
                    </span>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${
                    rec.priority === 'HIGH' 
                      ? 'text-red-500' 
                      : rec.priority === 'MEDIUM'
                      ? 'text-accent-500'
                      : 'text-primary-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pyramide des priorités */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center space-x-2">
          <Award className="w-5 h-5 text-primary-500" />
          <span>Pyramide des Priorités</span>
        </h3>

        <div className="space-y-4">
          {Object.entries(PRIORITY_LEVELS).map(([key, level]) => {
            const Icon = level.icon;
            return (
              <div 
                key={key}
                className={`p-4 rounded-xl border-2 ${
                  level.color === 'success' 
                    ? 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20' 
                    : level.color === 'primary'
                    ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-accent-200 dark:border-accent-800 bg-accent-50 dark:bg-accent-900/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    level.color === 'success' 
                      ? 'bg-success-200 dark:bg-success-800' 
                      : level.color === 'primary'
                      ? 'bg-primary-200 dark:bg-primary-800'
                      : 'bg-accent-200 dark:bg-accent-800'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      level.color === 'success' 
                        ? 'text-success-700 dark:text-success-300' 
                        : level.color === 'primary'
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-accent-700 dark:text-accent-300'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold ${
                      level.color === 'success' 
                        ? 'text-success-800 dark:text-success-200' 
                        : level.color === 'primary'
                        ? 'text-primary-800 dark:text-primary-200'
                        : 'text-accent-800 dark:text-accent-200'
                    }`}>
                      Niveau {key === 'VITAL' ? '1' : key === 'COMFORT' ? '2' : '3'} - {level.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{level.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      <span className="font-semibold">Exemples:</span> {level.examples}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" />
            <span>
              En mode économie, les appareils de Niveau 3 (Luxe) sont coupés ou limités, 
              le Niveau 2 (Confort) est réduit en mode nuit, et le Niveau 1 (Vital) reste toujours actif.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default EconomyMode;
