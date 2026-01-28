import { useState, useEffect } from 'react';
import { deviceScheduleService, energyService } from '@common/services';
import { 
  Clock, Calendar, Plus, Trash2, Edit2, Power, PowerOff, Check, X,
  Zap, Lightbulb, Tv, Wind, Snowflake, Droplets, Monitor, Smartphone,
  Brain, Sparkles, Users, PlayCircle, PauseCircle, Settings, Search,
  ChevronRight, Radio, Gamepad2
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

// Jours de la semaine
const DAYS = [
  { value: 1, label: 'Lun', fullLabel: 'Lundi' },
  { value: 2, label: 'Mar', fullLabel: 'Mardi' },
  { value: 3, label: 'Mer', fullLabel: 'Mercredi' },
  { value: 4, label: 'Jeu', fullLabel: 'Jeudi' },
  { value: 5, label: 'Ven', fullLabel: 'Vendredi' },
  { value: 6, label: 'Sam', fullLabel: 'Samedi' },
  { value: 7, label: 'Dim', fullLabel: 'Dimanche' },
];

// Icônes par type d'appareil
const getDeviceIcon = (type) => {
  const t = type?.toUpperCase();
  switch (t) {
    case 'AMPOULE': return Lightbulb;
    case 'TV': return Tv;
    case 'CLIM': return Wind;
    case 'VENTILATEUR': return Wind;
    case 'FRIGO': return Snowflake;
    case 'CHAUFFE_EAU': return Droplets;
    case 'MACHINE_A_LAVER': return Droplets;
    case 'ORDINATEUR': return Monitor;
    case 'TELEPHONE': return Smartphone;
    case 'RADIO': return Radio;
    case 'CONSOLE': return Gamepad2;
    default: return Zap;
  }
};

function DeviceScheduler({ homeId, userRole, permissions, familyMembers = [] }) {
  const notify = useNotification();
  const [schedules, setSchedules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'schedules' | 'auto'
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // Formulaire nouveau programme
  const [newSchedule, setNewSchedule] = useState({
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    startTime: '08:00',
    endTime: '22:00',
    action: 'ON',
    appliesToAll: true,
    allowedMembers: [],
  });

  useEffect(() => {
    if (homeId) {
      loadData();
    }
  }, [homeId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger les appareils en premier
      const devicesData = await energyService.getDevices(homeId);
      console.log('Appareils chargés:', devicesData);
      setDevices(devicesData.devices || []);

      // Charger les programmes
      const schedulesData = await deviceScheduleService.getSchedules(homeId);
      console.log('Programmes chargés:', schedulesData);
      setSchedules(schedulesData.schedules || []);

      // Charger les suggestions IA
      try {
        const suggestionsData = await deviceScheduleService.getAISuggestions(homeId);
        setSuggestions(suggestionsData.suggestions || []);
      } catch (e) {
        console.log('Pas de suggestions IA');
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScheduleModal = (device) => {
    setSelectedDevice(device);
    setNewSchedule({
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      startTime: '08:00',
      endTime: '22:00',
      action: 'ON',
      appliesToAll: true,
      allowedMembers: [],
    });
    setShowAddModal(true);
  };

  const handleCreateSchedule = async () => {
    if (!selectedDevice) {
      notify.warning('Veuillez sélectionner un appareil');
      return;
    }

    setSaving(true);
    try {
      await deviceScheduleService.createSchedule(
        homeId,
        selectedDevice.id,
        selectedDevice.source || 'MANUAL',
        selectedDevice.name,
        {
          daysOfWeek: newSchedule.daysOfWeek,
          startTime: newSchedule.startTime,
          endTime: newSchedule.endTime,
          action: newSchedule.action,
          appliesToAll: newSchedule.appliesToAll,
          allowedMembers: newSchedule.allowedMembers,
        }
      );

      setShowAddModal(false);
      setSelectedDevice(null);
      loadData();
      notify.success('Programme créé avec succès !', {
        title: '✨ Programmation enregistrée',
        duration: 5000,
      });
    } catch (error) {
      console.error('Erreur création programme:', error);
      console.error('Détails:', error.response?.data);
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.errors?.map(e => e.msg || e.message).join(', ') ||
                       'Erreur lors de la création du programme';
      notify.error(errorMsg, { title: 'Échec de la création' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer ce programme ?',
      message: 'Cette action est irréversible. Le programme sera définitivement supprimé.',
      type: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await deviceScheduleService.deleteSchedule(scheduleId);
          loadData();
          notify.success('Programme supprimé', { title: 'Suppression réussie' });
        } catch (error) {
          console.error('Erreur suppression:', error);
          notify.error(error.response?.data?.error || 'Erreur lors de la suppression');
        }
      },
    });
  };

  const handleToggleSchedule = async (scheduleId) => {
    try {
      const result = await deviceScheduleService.toggleSchedule(scheduleId);
      loadData();
      notify.info(result.isActive ? 'Programme activé' : 'Programme désactivé', {
        title: result.isActive ? '▶️ Activé' : '⏸️ Désactivé',
        duration: 3000,
      });
    } catch (error) {
      console.error('Erreur toggle:', error);
      notify.error('Erreur lors de la modification');
    }
  };

  const handleAcceptSuggestion = async (suggestionId) => {
    try {
      await deviceScheduleService.acceptSuggestion(suggestionId);
      loadData();
      notify.success('Suggestion acceptée et programme créé !', {
        title: '🤖 Suggestion IA appliquée',
        duration: 5000,
      });
    } catch (error) {
      console.error('Erreur acceptation:', error);
      notify.error(error.response?.data?.error || 'Erreur lors de l\'acceptation');
    }
  };

  const handleRejectSuggestion = async (suggestionId) => {
    try {
      await deviceScheduleService.rejectSuggestion(suggestionId);
      setSuggestions(suggestions.filter(s => s.id !== suggestionId));
      notify.info('Suggestion rejetée', { duration: 2000 });
    } catch (error) {
      console.error('Erreur rejet:', error);
    }
  };

  const toggleDay = (day) => {
    const days = newSchedule.daysOfWeek.includes(day)
      ? newSchedule.daysOfWeek.filter(d => d !== day)
      : [...newSchedule.daysOfWeek, day].sort();
    setNewSchedule({ ...newSchedule, daysOfWeek: days });
  };

  const canModify = userRole !== 'CHILD' && permissions?.canControlDevices !== false;

  // Filtrer les appareils par recherche
  const filteredDevices = devices.filter(device => 
    device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compter les programmes par appareil
  const getScheduleCountForDevice = (deviceId) => {
    return schedules.filter(s => s.deviceId === deviceId).length;
  };

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Programmation des Appareils
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {devices.length} appareils • {schedules.length} programmes actifs
              </p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
              activeTab === 'devices'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Mes Appareils ({devices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
              activeTab === 'schedules'
                ? 'bg-success-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Programmes ({schedules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
              activeTab === 'auto'
                ? 'bg-accent-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Suggestions IA ({suggestions.length})</span>
          </button>
        </div>
      </div>

      {/* Onglet: Mes Appareils */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un appareil..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
          </div>

          {/* Liste des appareils */}
          {filteredDevices.length === 0 ? (
            <div className="card text-center py-12">
              <Zap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'Aucun appareil trouvé' : 'Aucun appareil détecté'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Ajoutez des appareils dans "Smart Save" pour les programmer
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.type);
                const scheduleCount = getScheduleCountForDevice(device.id);
                const isOn = device.isOn;

                return (
                  <div
                    key={device.id}
                    className="card hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => canModify && handleOpenScheduleModal(device)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          isOn 
                            ? 'bg-success-100 dark:bg-success-900/30' 
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <DeviceIcon className={`w-6 h-6 ${
                            isOn 
                              ? 'text-success-600 dark:text-success-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {device.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isOn 
                                ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {isOn ? '● Allumé' : '○ Éteint'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {device.powerRating}W
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {canModify && (
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      )}
                    </div>

                    {/* Badge nombre de programmes */}
                    {scheduleCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                          📅 {scheduleCount} programme{scheduleCount > 1 ? 's' : ''} configuré{scheduleCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Source */}
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        device.source === 'NILM' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                      }`}>
                        {device.source === 'NILM' ? '🎯 Détecté IoT' : '📝 Manuel'}
                      </span>
                    </div>

                    {/* Bouton programmer */}
                    {canModify && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenScheduleModal(device);
                        }}
                        className="mt-4 w-full py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold text-sm hover:from-primary-600 hover:to-primary-700 transition-all flex items-center justify-center space-x-2"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Programmer</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Onglet: Programmes actifs */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucun programme configuré
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Cliquez sur un appareil dans l'onglet "Mes Appareils" pour créer un programme
              </p>
              <button
                onClick={() => setActiveTab('devices')}
                className="btn-primary"
              >
                Voir mes appareils
              </button>
            </div>
          ) : (
            schedules.map((schedule) => {
              const DeviceIcon = getDeviceIcon(schedule.deviceType);
              return (
                <div
                  key={schedule.id}
                  className={`card border-l-4 ${
                    schedule.isActive 
                      ? 'border-success-500 bg-success-50/50 dark:bg-success-900/10' 
                      : 'border-gray-300 dark:border-gray-600 opacity-60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        schedule.isActive 
                          ? 'bg-success-100 dark:bg-success-900/30' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <DeviceIcon className={`w-6 h-6 ${
                          schedule.isActive 
                            ? 'text-success-600 dark:text-success-400' 
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">
                          {schedule.deviceName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-sm font-semibold ${
                            schedule.action === 'ON' 
                              ? 'text-success-600 dark:text-success-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {schedule.action === 'ON' ? '⚡ Allumer' : '🔌 Éteindre'}
                          </span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-primary-600 dark:text-primary-400 font-semibold">
                            {schedule.startTime} → {schedule.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Jours */}
                      <div className="flex space-x-1">
                        {DAYS.map((day) => (
                          <span
                            key={day.value}
                            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                              schedule.daysOfWeek?.includes(day.value)
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                            }`}
                            title={day.fullLabel}
                          >
                            {day.label[0]}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      {canModify && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => handleToggleSchedule(schedule.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              schedule.isActive
                                ? 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 hover:bg-success-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                            }`}
                            title={schedule.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {schedule.isActive ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info créateur */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex items-center justify-between">
                    <span>Créé par {schedule.createdByName || 'Système'}</span>
                    <span>{schedule.autoDetected ? '🤖 IA' : '👤 Manuel'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Onglet: Suggestions IA */}
      {activeTab === 'auto' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="card text-center py-12">
              <Brain className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                L'IA analyse vos habitudes d'utilisation...
              </p>
              <p className="text-sm text-gray-500">
                Des suggestions apparaîtront ici pour optimiser votre consommation
              </p>
            </div>
          ) : (
            <div className="card bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 border-2 border-accent-200 dark:border-accent-800">
              <h4 className="font-bold text-accent-800 dark:text-accent-200 mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Suggestions intelligentes</span>
              </h4>

              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                          {suggestion.title}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 px-2 py-1 rounded-full">
                            💰 Économie: {suggestion.potentialSavingPercent}%
                          </span>
                          <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                            🎯 Confiance: {Math.round((suggestion.confidenceScore || 0.8) * 100)}%
                          </span>
                        </div>
                      </div>

                      {canModify && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleAcceptSuggestion(suggestion.id)}
                            className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 hover:bg-success-200"
                            title="Accepter"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectSuggestion(suggestion.id)}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
                            title="Rejeter"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal création programme */}
      {showAddModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const DeviceIcon = getDeviceIcon(selectedDevice.type);
                    return (
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <DeviceIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Programmer
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedDevice.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddModal(false); setSelectedDevice(null); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Action */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Que voulez-vous faire ?
                </label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setNewSchedule({ ...newSchedule, action: 'ON' })}
                    className={`flex-1 py-4 rounded-xl border-2 font-semibold flex flex-col items-center justify-center space-y-2 transition-all ${
                      newSchedule.action === 'ON'
                        ? 'border-success-500 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-success-300'
                    }`}
                  >
                    <Power className="w-8 h-8" />
                    <span>Allumer</span>
                  </button>
                  <button
                    onClick={() => setNewSchedule({ ...newSchedule, action: 'OFF' })}
                    className={`flex-1 py-4 rounded-xl border-2 font-semibold flex flex-col items-center justify-center space-y-2 transition-all ${
                      newSchedule.action === 'OFF'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300'
                    }`}
                  >
                    <PowerOff className="w-8 h-8" />
                    <span>Éteindre</span>
                  </button>
                </div>
              </div>

              {/* Horaires */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  À quelle heure ?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Début</label>
                    <input
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                      className="input w-full text-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fin</label>
                    <input
                      type="time"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                      className="input w-full text-lg font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Jours */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Quels jours ?
                </label>
                <div className="flex justify-between gap-1">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                        newSchedule.daysOfWeek.includes(day.value)
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setNewSchedule({ ...newSchedule, daysOfWeek: [1,2,3,4,5,6,7] })}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Tous les jours
                  </button>
                  <button
                    onClick={() => setNewSchedule({ ...newSchedule, daysOfWeek: [1,2,3,4,5] })}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Semaine
                  </button>
                  <button
                    onClick={() => setNewSchedule({ ...newSchedule, daysOfWeek: [6,7] })}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Weekend
                  </button>
                </div>
              </div>

              {/* Résumé */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Résumé :</span> {selectedDevice.name} sera{' '}
                  <span className={newSchedule.action === 'ON' ? 'text-success-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {newSchedule.action === 'ON' ? 'allumé' : 'éteint'}
                  </span>{' '}
                  de <span className="font-semibold">{newSchedule.startTime}</span> à{' '}
                  <span className="font-semibold">{newSchedule.endTime}</span> les{' '}
                  <span className="font-semibold">
                    {newSchedule.daysOfWeek.length === 7 
                      ? 'tous les jours' 
                      : newSchedule.daysOfWeek.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => { setShowAddModal(false); setSelectedDevice(null); }}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={saving}
                className="btn-primary flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Créer le programme</span>
                  </>
                )}
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
        cancelText={confirmDialog.cancelText}
      />
    </div>
  );
}

export default DeviceScheduler;
