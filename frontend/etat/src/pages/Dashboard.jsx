import { useState, useEffect } from 'react';
import { authService, stateService } from '@common/services';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import EtatSidebar from '../components/EtatSidebar';
import ErrorBoundary from '../components/ErrorBoundary';

// Import des modules
import OverviewSection from '../components/OverviewSection';
import AnalyticsSection from '../components/AnalyticsSection';
import FinancialSection from '../components/FinancialSection';
import HydroPlanningSection from '../components/HydroPlanningSection';
import RuralPlanningSection from '../components/RuralPlanningSection';
import PerformanceAuditSection from '../components/PerformanceAuditSection';
import SocialImpactSection from '../components/SocialImpactSection';
import MaintenancePredictiveSection from '../components/MaintenancePredictiveSection';
import GeographicSection from '../components/GeographicSection';
import ReportsSection from '../components/ReportsSection';
import SettingsSection from '../components/SettingsSection';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [showMessaging, setShowMessaging] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (!storedUser || storedUser.role !== 'ADMIN_ETAT') {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    setLoading(false);
  }, [navigate]);

  // Formater le nom de l'utilisateur pour corriger les problèmes d'encodage
  const formatUserName = (nom) => {
    if (!nom) return 'Ministre de l\'Énergie';
    
    // Si c'est l'admin État, utiliser le titre officiel
    if (user?.email === 'admin@energie.gn') {
      return 'Ministre de l\'Énergie';
    }
    
    // Corriger les problèmes d'encodage courants
    return nom
      .replace(/l'Energie/gi, "l'Énergie")
      .replace(/l'??nergie/gi, "l'Énergie")
      .replace(/l'Ã‰nergie/gi, "l'Énergie")
      .replace(/l'Ã©nergie/gi, "l'Énergie");
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar - Fixed */}
      <EtatSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Main Content - Scrollable independently */}
      <div className="flex-1 ml-64 overflow-y-auto" style={{ height: '100vh' }}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    SIGE-Guinée
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ministère de l'État - Pilotage de Souveraineté
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {formatUserName(user?.nom)}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content - Centered */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'analytics' && <AnalyticsSection />}
            {activeSection === 'financial' && <FinancialSection />}
            {activeSection === 'hydro' && <HydroPlanningSection />}
            {activeSection === 'rural' && <RuralPlanningSection />}
            {activeSection === 'audit' && <PerformanceAuditSection />}
            {activeSection === 'social' && <SocialImpactSection />}
            {activeSection === 'maintenance' && <MaintenancePredictiveSection />}
            {activeSection === 'geographic' && <GeographicSection />}
            {activeSection === 'reports' && <ReportsSection />}
            {activeSection === 'settings' && <SettingsSection user={user} />}
          </ErrorBoundary>
        </main>

        {/* Messagerie ÉTAT-EDG (Overlay) */}
        {showMessaging && (
          <EtatEdgMessaging onClose={() => setShowMessaging(false)} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
