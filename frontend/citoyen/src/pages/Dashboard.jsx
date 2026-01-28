import { useState, useEffect } from 'react';
import { authService, homesService, energyService } from '@common/services';
import { useNavigate } from 'react-router-dom';
import { LogOut, Zap, Battery, Activity, AlertTriangle, X, Shield, Lock } from 'lucide-react';
import HomeSwitcher from '../components/HomeSwitcher';
import FamilyManagement from '../components/FamilyManagement';
import EnergyTransfer from '../components/EnergyTransfer';
import DeviceAnalytics from '../components/DeviceAnalytics';
import MeterPairing from '../components/MeterPairing';
import SmartSave from '../components/SmartSave';
import EconomyMode from '../components/EconomyMode';
import DeviceScheduler from '../components/DeviceScheduler';
import PredictiveMaintenance from '../components/PredictiveMaintenance';
import IncidentReport from '../components/IncidentReport';
import DashboardSidebar from '../components/DashboardSidebar';
import AddHomeModal from '../components/AddHomeModal';
import ThemeToggle from '../components/ThemeToggle';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../components/Notification';

function Dashboard() {
  const notify = useNotification();
  const [user, setUser] = useState(null);
  const [homes, setHomes] = useState([]);
  const [selectedHome, setSelectedHome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [energyData, setEnergyData] = useState(null);
  const [loadSheddingAlert, setLoadSheddingAlert] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [addingHome, setAddingHome] = useState(false);
  const navigate = useNavigate();

  // Connexion WebSocket pour les alertes de délestage (désactivé temporairement pour debug)
  // const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
  // const { isConnected, lastMessage } = useWebSocket(WS_URL, {
  //   onMessage: (data) => {
  //     if (data.type === 'load_shedding') {
  //       setLoadSheddingAlert({
  //         type: data.event,
  //         zoneId: data.zoneId,
  //         message: data.message,
  //         timestamp: data.timestamp,
  //       });
  //     }
  //   },
  // });

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    loadHomes();
  }, []);

  useEffect(() => {
    if (selectedHome) {
      loadEnergyData(selectedHome.id);
    }
  }, [selectedHome]);

  // Récupérer les permissions de l'utilisateur dans le foyer sélectionné
  const isOwner = selectedHome?.proprietaireId === user?.id;
  const { userRole, permissions, loading: permissionsLoading } = usePermissions(
    selectedHome?.id,
    user?.id,
    isOwner
  );

  const loadHomes = async () => {
    try {
      const data = await homesService.getHomes();
      console.log('📦 Données reçues de l\'API:', data);
      console.log('🏠 Foyers:', data.homes);
      setHomes(data.homes || []);
      if (data.homes && data.homes.length > 0) {
        setSelectedHome(data.homes[0]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement foyers:', error);
      console.error('📋 Détails erreur:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEnergyData = async (homeId) => {
    try {
      const data = await energyService.getConsumption(homeId);
      setEnergyData(data);
    } catch (error) {
      console.error('Erreur chargement données énergétiques:', error);
    }
  };

  const handleHomeChange = (home) => {
    setSelectedHome(home);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  // Afficher un badge de rôle
  const getRoleBadge = (role) => {
    const badges = {
      ADMIN: { label: 'Administrateur', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300', icon: Shield },
      MEMBER: { label: 'Membre', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', icon: Activity },
      CHILD: { label: 'Enfant', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300', icon: Activity },
    };
    return badges[role] || badges.MEMBER;
  };

  const roleBadge = selectedHome ? getRoleBadge(userRole) : null;

  const handleAddHome = async (homeData) => {
    setAddingHome(true);
    try {
      const response = await homesService.createHome(homeData);
      // Recharger la liste des foyers
      await loadHomes();
      // Sélectionner le nouveau foyer créé
      if (response.home && response.home.id) {
        setSelectedHome(response.home);
      }
      setShowAddHomeModal(false);
      notify.success(`Foyer "${homeData.name}" créé avec succès !`, {
        title: '🏠 Nouveau foyer',
        duration: 5000,
      });
    } catch (error) {
      console.error('Erreur création foyer:', error);
      notify.error(error.response?.data?.error || 'Erreur lors de la création du foyer', {
        title: 'Échec de création',
      });
    } finally {
      setAddingHome(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-all duration-300">
      {/* Header moderne et responsive */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg border-b-2 border-primary-200 dark:border-primary-900 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo - toujours visible */}
            <div className="flex items-center space-x-2 sm:space-x-3 animate-fade-in flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  SIGE-Guinée
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">Espace Citoyen</p>
              </div>
            </div>

            {/* Actions header - responsive */}
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 animate-slide-down">
              {/* Sélecteur de foyer - responsive */}
              {homes.length > 0 && (
                <div className="max-w-[120px] sm:max-w-[180px] lg:max-w-none">
                  <HomeSwitcher
                    selectedHomeId={selectedHome?.id}
                    onHomeChange={handleHomeChange}
                  />
                </div>
              )}
              
              {/* Theme toggle - toujours visible */}
              <ThemeToggle />
              
              {/* Info utilisateur - desktop seulement */}
              <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.nom?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                  {user?.nom}
                </span>
              </div>

              {/* Avatar mobile/tablette */}
              <div className="lg:hidden w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.nom?.charAt(0) || 'U'}
              </div>
              
              {/* Bouton déconnexion */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 lg:px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden lg:inline font-medium text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content avec Sidebar - Layout responsive */}
      <div className="flex gap-4 lg:gap-6 max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Sidebar de navigation - gérée en interne pour être responsive */}
        {selectedHome && homes.length > 0 && (
          <DashboardSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        )}

        {/* Contenu principal - padding bottom pour menu mobile/tablette */}
        <main className="flex-1 min-w-0 pb-20 md:pb-20 lg:pb-0">
        {/* Alerte de délestage */}
        {loadSheddingAlert && (
          <div className={`mb-6 card border-l-4 ${
            loadSheddingAlert.type === 'SHED_HEAVY_LOADS' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-green-500 bg-green-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className={`w-6 h-6 ${
                  loadSheddingAlert.type === 'SHED_HEAVY_LOADS' 
                    ? 'text-orange-600' 
                    : 'text-green-600'
                }`} />
                <div>
                  <h3 className={`font-semibold ${
                    loadSheddingAlert.type === 'SHED_HEAVY_LOADS' 
                      ? 'text-orange-900' 
                      : 'text-green-900'
                  }`}>
                    {loadSheddingAlert.type === 'SHED_HEAVY_LOADS' 
                      ? 'Mode Économie Réseau Activé' 
                      : 'Restauration du Réseau'}
                  </h3>
                  <p className={`text-sm ${
                    loadSheddingAlert.type === 'SHED_HEAVY_LOADS' 
                      ? 'text-orange-700' 
                      : 'text-green-700'
                  }`}>
                    {loadSheddingAlert.message}
                  </p>
                  {loadSheddingAlert.zoneId && (
                    <p className="text-xs text-gray-600 mt-1">
                      Zone: {loadSheddingAlert.zoneId}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setLoadSheddingAlert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {homes.length === 0 ? (
          <div className="card text-center py-16 animate-scale-in max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Aucun foyer configuré</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">Ajoutez votre premier foyer pour commencer à suivre votre consommation d'énergie</p>
            <button 
              onClick={() => {
                console.log('Bouton cliqué, ouverture modal');
                setShowAddHomeModal(true);
              }}
              className="btn-primary mx-auto flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              <span>Ajouter un Foyer</span>
            </button>
          </div>
        ) : selectedHome ? (
          <div className="space-y-6 animate-fade-in">
            {/* En-tête du foyer sélectionné - Design moderne - Toujours visible */}
            {activeSection === 'overview' && (
              <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-xl animate-slide-down">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-3xl sm:text-4xl font-extrabold">{selectedHome.nom}</h2>
                      {roleBadge && (
                        <span className={`${roleBadge.color} px-4 py-1.5 rounded-full flex items-center space-x-1.5 text-sm font-semibold shadow-md`}>
                          <roleBadge.icon className="w-4 h-4" />
                          <span>{roleBadge.label}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-white/90">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4" />
                        {selectedHome.ville}
                      </span>
                      <span>•</span>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg font-medium">
                        {selectedHome.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Contenu des sections */}
            {activeSection === 'overview' && (
              <>
                {/* Statistiques énergétiques - Design attractif avec animations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {selectedHome.type !== 'SOLAIRE' && permissions.canViewFinancials ? (
                <div className="stat-card group animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">Crédit EDG</h3>
                    <div className="w-12 h-12 bg-primary-500/20 dark:bg-primary-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent mb-1">
                    {selectedHome.financials?.balance?.toLocaleString('fr-FR') || '0'}
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">GNF disponibles</p>
                </div>
              ) : selectedHome.type !== 'SOLAIRE' ? (
                <div className="card opacity-60 cursor-not-allowed">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-500 dark:text-gray-400">Crédit EDG</h3>
                    <Lock className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Accès restreint</p>
                </div>
              ) : null}

              {selectedHome.type !== 'EDG' && (
                <div className="success-card group animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">Batterie Solaire</h3>
                    <div className="w-12 h-12 bg-success-500/20 dark:bg-success-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Battery className="w-6 h-6 text-success-600 dark:text-success-400" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-success-600 to-success-500 bg-clip-text text-transparent mb-1">
                    - %
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">État de charge</p>
                </div>
              )}

              {energyData ? (
                <div className="accent-card group animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">Consommation</h3>
                    <div className="w-12 h-12 bg-accent-500/20 dark:bg-accent-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Activity className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-accent-600 to-accent-500 bg-clip-text text-transparent mb-1">
                    {energyData.statistics?.averagePower?.toFixed(0) || '0'} W
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne actuelle</p>
                </div>
              ) : (
                <div className="accent-card group animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">Consommation</h3>
                    <div className="w-12 h-12 bg-accent-500/20 dark:bg-accent-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Activity className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-accent-600 to-accent-500 bg-clip-text text-transparent mb-1">
                    0 W
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En attente de données</p>
                </div>
              )}
                </div>
              </>
            )}

            {activeSection === 'family' && (
              <FamilyManagement homeId={selectedHome.id} userRole={userRole} />
            )}

            {activeSection === 'transfer' && (
              <EnergyTransfer 
                currentHomeId={selectedHome.id} 
                canTransfer={permissions.canTransfer} 
              />
            )}

            {activeSection === 'pairing' && permissions.canConfigureHome && (
              <MeterPairing
                homeId={selectedHome.id}
                onPairingSuccess={(meter) => {
                  loadHomes();
                  if (selectedHome) {
                    loadEnergyData(selectedHome.id);
                  }
                }}
              />
            )}

            {activeSection === 'smartsave' && (
              <SmartSave 
                homeId={selectedHome.id} 
                userRole={userRole} 
                permissions={permissions} 
              />
            )}

            {activeSection === 'economymode' && (
              <EconomyMode 
                homeId={selectedHome.id}
                homeData={selectedHome}
                userRole={userRole} 
                permissions={permissions} 
              />
            )}

            {activeSection === 'scheduler' && (
              <DeviceScheduler 
                homeId={selectedHome.id}
                userRole={userRole} 
                permissions={permissions}
                familyMembers={[]}
              />
            )}

            {activeSection === 'maintenance' && permissions.canViewDetailedAnalytics && (
              <PredictiveMaintenance 
                homeId={selectedHome.id} 
                userRole={userRole} 
                permissions={permissions} 
              />
            )}

            {activeSection === 'analytics' && permissions.canViewDetailedAnalytics ? (
              <DeviceAnalytics homeId={selectedHome.id} userRole={userRole} permissions={permissions} />
            ) : activeSection === 'analytics' ? (
              <div className="card">
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Vue limitée - Contactez un administrateur pour plus d'informations
                  </p>
                </div>
              </div>
            ) : null}

            {activeSection === 'incidents' && (
              <IncidentReport 
                onReportSuccess={(incident) => {
                  console.log('Incident signalé:', incident);
                }}
              />
            )}

            {/* Message si section non accessible */}
            {activeSection === 'pairing' && !permissions.canConfigureHome && (
              <div className="card">
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Seuls les administrateurs peuvent configurer les kits IoT
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'maintenance' && !permissions.canViewDetailedAnalytics && (
              <div className="card">
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Vue limitée - Contactez un administrateur pour plus d'informations
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Sélectionnez un foyer pour commencer</p>
          </div>
        )}
        </main>
      </div>

      {/* Modal Ajouter un Foyer */}
      <AddHomeModal
        isOpen={showAddHomeModal}
        onClose={() => setShowAddHomeModal(false)}
        onSubmit={handleAddHome}
        loading={addingHome}
      />
    </div>
  );
}

export default Dashboard;
