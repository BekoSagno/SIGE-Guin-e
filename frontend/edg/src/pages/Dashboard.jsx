import { useState, useEffect } from 'react';
import { authService, gridService, incidentsService } from '@common/services';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Activity, AlertTriangle, LogOut, Zap, Users, TrendingUp, 
  TrendingDown, Shield, FileText, BarChart3, Bell, RefreshCw, Clock,
  CheckCircle, XCircle, MapPin, Map, Wrench, Radio, MessageSquare
} from 'lucide-react';
import EDGSidebar from '../components/EDGSidebar';
import ThemeToggle from '../components/ThemeToggle';
import { useNotification } from '../components/Notification';

// Import des modules
import SCADAMap from '../components/SCADAMap';
import ReconciliationModule from '../components/ReconciliationModule';
import SmartLoadShedding from '../components/SmartLoadShedding';
import PredictiveMaintenance from '../components/PredictiveMaintenance';
import IncidentDispatch from '../components/IncidentDispatch';
import ClientsManagement from '../components/ClientsManagement';
import NetworkMonitoring from '../components/NetworkMonitoring';
import FraudDetection from '../components/FraudDetection';
import BillingModule from '../components/BillingModule';
import AnalyticsModule from '../components/AnalyticsModule';
import BroadcastModule from '../components/BroadcastModule';
import PersonnelManagement from '../components/PersonnelManagement';
import TaskManagement from '../components/TaskManagement';
import TaskReports from '../components/TaskReports';
import SigeIdSearch from '../components/SigeIdSearch';

function Dashboard() {
  const notify = useNotification();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // Données du dashboard
  const [stats, setStats] = useState({
    totalClients: 0,
    activeMeters: 0,
    totalConsumption: 0,
    revenue: 0,
    incidents: 0,
    fraudAlerts: 0,
    zones: [],
    transformers: [],
    recentIncidents: [],
  });

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (!storedUser || storedUser.role !== 'AGENT_EDG') {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    loadData();
    
    // Rafraîchissement automatique toutes les 30 secondes
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [zonesData, transformersData, incidentsData] = await Promise.all([
        gridService.getZones().catch(() => ({ zones: [] })),
        gridService.getTransformers().catch(() => ({ transformers: [] })),
        incidentsService.getIncidents().catch(() => ({ incidents: [] })),
      ]);
      
      const zones = zonesData.zones || [];
      const transformers = transformersData.transformers || [];
      const incidents = incidentsData.incidents || [];
      
      const totalMeters = zones.reduce((sum, z) => sum + (z.onlineMeters || 0), 0);
      const fraudAlerts = incidents.filter(i => i.incidentType === 'FRAUDE_SUSPECTEE').length;
      const openIncidents = incidents.filter(i => i.status === 'OPEN').length;
      
      setStats({
        totalClients: totalMeters * 3,
        activeMeters: totalMeters,
        totalConsumption: Math.round(transformers.reduce((sum, t) => sum + (t.currentLoad || 0), 0) / 1000),
        revenue: totalMeters * 125000,
        incidents: openIncidents,
        fraudAlerts,
        zones,
        transformers,
        recentIncidents: incidents.slice(0, 10),
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    notify.success('Données actualisées', { title: '🔄 Rafraîchissement' });
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Compteurs d'alertes pour la sidebar
  const alertCounts = {
    incidents: stats.incidents,
    frauds: stats.fraudAlerts,
    alerts: stats.incidents + stats.fraudAlerts,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Chargement du centre de contrôle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-all duration-300 relative" style={{ pointerEvents: 'auto' }}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg border-b-2 border-primary-200 dark:border-primary-900 sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3 animate-fade-in flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  SIGE-Guinée
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Centre de Contrôle EDG</p>
              </div>
            </div>

            {/* Centre - Statut réseau en temps réel */}
            <div className="hidden lg:flex items-center space-x-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Réseau: Opérationnel</span>
              </div>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.activeMeters} compteurs
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 sm:p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <ThemeToggle />
              
              <div className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.nom?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.nom}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Agent EDG</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden lg:inline font-medium text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex gap-4 lg:gap-6 max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 relative" style={{ pointerEvents: 'auto' }}>
        {/* Sidebar */}
        <EDGSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          alertCounts={alertCounts}
        />

        {/* Contenu principal */}
        <main className="flex-1 min-w-0 pb-20 md:pb-20 lg:pb-0 relative z-10">
          {activeSection === 'overview' && (
            <OverviewSection stats={stats} onRefresh={handleRefresh} onNavigate={setActiveSection} />
          )}
          
          {activeSection === 'map' && (
            <SCADAMap stats={stats} />
          )}
          
          {activeSection === 'clients' && (
            <ClientsManagement />
          )}
          
          {activeSection === 'monitoring' && (
            <NetworkMonitoring stats={stats} />
          )}
          
          {activeSection === 'broadcast' && (
            <BroadcastModule />
          )}
          
          {activeSection === 'reconciliation' && (
            <ReconciliationModule />
          )}
          
          {activeSection === 'fraud' && (
            <FraudDetection incidents={stats.recentIncidents} />
          )}
          
          {activeSection === 'incidents' && (
            <IncidentDispatch />
          )}
          
          {activeSection === 'loadshedding' && (
            <SmartLoadShedding />
          )}
          
          {activeSection === 'maintenance' && (
            <PredictiveMaintenance />
          )}
          
          {activeSection === 'billing' && (
            <BillingModule />
          )}
          
          {activeSection === 'analytics' && (
            <AnalyticsModule stats={stats} />
          )}
          
          {activeSection === 'notifications' && (
            <AlertsSection incidents={stats.recentIncidents} fraudCount={stats.fraudAlerts} />
          )}
          
          {activeSection === 'personnel' && (
            <PersonnelManagement />
          )}
          
          {activeSection === 'tasks' && (
            <TaskManagement />
          )}
          
          {activeSection === 'reports' && (
            <TaskReports />
          )}
          
          {activeSection === 'sige-id' && (
            <SigeIdSearch />
          )}
          
          {activeSection === 'settings' && (
            <SettingsSection user={user} />
          )}
        </main>
      </div>
    </div>
  );
}

// ==================== SECTION OVERVIEW ====================
function OverviewSection({ stats, onRefresh, onNavigate }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Titre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Centre de Commande
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Supervision en temps réel du réseau électrique
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}</span>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Clients actifs" value={stats.totalClients.toLocaleString()} icon={Users} trend={+5.2} color="primary" />
        <StatCard title="Compteurs en ligne" value={stats.activeMeters.toLocaleString()} icon={Activity} trend={+2.1} color="success" />
        <StatCard title="Consommation" value={`${stats.totalConsumption.toLocaleString()} kW`} icon={Zap} trend={-3.4} color="accent" />
        <StatCard title="Revenus (mois)" value={`${(stats.revenue / 1000000).toFixed(1)}M GNF`} icon={FileText} trend={+8.7} color="success" />
      </div>

      {/* Alertes critiques */}
      {(stats.incidents > 0 || stats.fraudAlerts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.incidents > 0 && (
            <div 
              className="warning-card flex items-center justify-between cursor-pointer hover:shadow-lg transition-all relative z-10" 
              onClick={() => onNavigate('incidents')}
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200">{stats.incidents} Incidents ouverts</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">Nécessitent une attention</p>
                </div>
              </div>
              <button 
                className="btn-warning text-sm px-4 py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('incidents');
                }}
              >
                Voir
              </button>
            </div>
          )}
          
          {stats.fraudAlerts > 0 && (
            <div 
              className="danger-card flex items-center justify-between cursor-pointer hover:shadow-lg transition-all relative z-10" 
              onClick={() => onNavigate('reconciliation')}
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-red-800 dark:text-red-200">{stats.fraudAlerts} Alertes fraude</p>
                  <p className="text-sm text-red-600 dark:text-red-400">Anomalies détectées</p>
                </div>
              </div>
              <button 
                className="btn-danger text-sm px-4 py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('reconciliation');
                }}
              >
                Analyser
              </button>
            </div>
          )}
        </div>
      )}

      {/* Accès rapides aux modules */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <QuickAccessCard icon={Map} title="Carte SCADA" description="Supervision temps réel" color="primary" onClick={() => onNavigate('map')} />
        <QuickAccessCard icon={MessageSquare} title="Diffusion" description="Communiquer usagers" color="teal" onClick={() => onNavigate('broadcast')} />
        <QuickAccessCard icon={Shield} title="Réconciliation" description="Détection fraude" color="red" onClick={() => onNavigate('reconciliation')} />
        <QuickAccessCard icon={Radio} title="Délestage IoT" description="Contrôle MQTT" color="purple" onClick={() => onNavigate('loadshedding')} />
        <QuickAccessCard icon={Wrench} title="Maintenance" description="Prédictive IA" color="amber" onClick={() => onNavigate('maintenance')} />
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charge des transformateurs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Charge Transformateurs</h3>
            <Building2 className="w-5 h-5 text-primary-500" />
          </div>
          
          <div className="space-y-4">
            {stats.transformers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun transformateur détecté</p>
            ) : (
              stats.transformers.map((transformer) => (
                <TransformerCard key={transformer.transformerId} transformer={transformer} />
              ))
            )}
          </div>
        </div>

        {/* Zones actives */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Zones de Distribution</h3>
            <MapPin className="w-5 h-5 text-primary-500" />
          </div>
          
          <div className="space-y-3">
            {stats.zones.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune zone configurée</p>
            ) : (
              stats.zones.map((zone) => (
                <div key={zone.zoneId} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{zone.zoneId}</span>
                    <span className="badge-info">{zone.onlineMeters} compteurs</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span>Statut: Actif</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPOSANTS RÉUTILISABLES ====================

function StatCard({ title, value, icon: Icon, trend, color }) {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    accent: 'from-purple-500 to-purple-600',
    warning: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-bl-full`}></div>
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-success-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function QuickAccessCard({ icon: Icon, title, description, color, onClick }) {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
    red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
    teal: 'from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} cursor-pointer transform hover:scale-105 transition-all shadow-lg hover:shadow-xl relative z-10`}
      style={{ pointerEvents: 'auto' }}
    >
      <Icon className="w-8 h-8 text-white mb-3" />
      <h4 className="font-bold text-white">{title}</h4>
      <p className="text-sm text-white/80">{description}</p>
    </div>
  );
}

function TransformerCard({ transformer }) {
  const getStatusColor = (status) => {
    if (status === 'CRITICAL') return 'bg-red-500';
    if (status === 'WARNING') return 'bg-amber-500';
    return 'bg-success-500';
  };

  const getProgressColor = (status) => {
    if (status === 'CRITICAL') return 'progress-danger';
    if (status === 'WARNING') return 'progress-warning';
    return 'progress-success';
  };

  return (
    <div className={`p-4 rounded-xl border-l-4 ${
      transformer.status === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
      transformer.status === 'WARNING' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
      'border-success-500 bg-success-50 dark:bg-success-900/20'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{transformer.zoneId}</span>
        <span className={`badge ${
          transformer.status === 'CRITICAL' ? 'badge-danger' :
          transformer.status === 'WARNING' ? 'badge-warning' :
          'badge-success'
        }`}>
          {transformer.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Charge: {transformer.loadPercentage?.toFixed(1)}% ({(transformer.currentLoad / 1000).toFixed(1)} kW)
      </p>
      <div className="progress-bar">
        <div 
          className={`progress-bar-fill ${getProgressColor(transformer.status)}`}
          style={{ width: `${Math.min(transformer.loadPercentage || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ==================== SECTIONS PLACEHOLDER ====================

function AlertsSection({ incidents, fraudCount }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Centre d'Alertes</h2>
      <div className="card">
        <p className="text-gray-600 dark:text-gray-400">
          {incidents.length + fraudCount} alertes actives
        </p>
      </div>
    </div>
  );
}

function SettingsSection({ user }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Paramètres</h2>
      <div className="card">
        <h3 className="font-semibold mb-4">Profil Agent</h3>
        <div className="space-y-2">
          <p><strong>Nom:</strong> {user?.nom}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Rôle:</strong> Agent EDG</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
