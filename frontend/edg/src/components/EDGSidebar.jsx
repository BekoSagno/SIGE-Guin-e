import { 
  LayoutDashboard, Users, Activity, AlertTriangle, Shield, Zap, 
  FileText, Settings, ChevronUp, ChevronDown, Menu, X, Building2,
  BarChart3, Bell, Map, Wrench, Radio, Scale, MessageSquare,
  UserCog, ClipboardList, QrCode, FileBarChart
} from 'lucide-react';
import { useState, useEffect } from 'react';

const menuItems = [
  { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard, color: 'primary' },
  { id: 'map', label: 'Carte SCADA', icon: Map, color: 'primary' },
  { id: 'clients', label: 'Gestion Clients', icon: Users, color: 'primary' },
  { id: 'new-users', label: 'Nouveaux Utilisateurs', icon: Users, color: 'success', badge: 'new' },
  { id: 'sige-id', label: 'Recherche ID SIGE', icon: QrCode, color: 'primary' },
  { id: 'monitoring', label: 'Monitoring Réseau', icon: Activity, color: 'success' },
  { id: 'broadcast', label: 'Diffusion', icon: MessageSquare, color: 'success' },
  { id: 'personnel', label: 'Personnel', icon: UserCog, color: 'primary' },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList, color: 'warning' },
  { id: 'reports', label: 'Rapports', icon: FileBarChart, color: 'success' },
  { id: 'reconciliation', label: 'Réconciliation', icon: Scale, color: 'danger' },
  { id: 'fraud', label: 'Détection Fraude', icon: Shield, color: 'danger' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, color: 'warning' },
  { id: 'loadshedding', label: 'Délestage IoT', icon: Radio, color: 'accent' },
  { id: 'maintenance', label: 'Maintenance IA', icon: Wrench, color: 'warning' },
  { id: 'billing', label: 'Facturation', icon: FileText, color: 'primary' },
  { id: 'analytics', label: 'Analytique', icon: BarChart3, color: 'success' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'warning' },
  { id: 'settings', label: 'Paramètres', icon: Settings, color: 'primary' },
];

function EDGSidebar({ activeSection, onSectionChange, alertCounts = {} }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const element = document.getElementById('edg-sidebar');
      if (element) {
        setShowScrollTop(element.scrollTop > 50);
        setShowScrollBottom(element.scrollHeight - element.scrollTop - element.clientHeight > 50);
      }
    };

    const element = document.getElementById('edg-sidebar');
    if (element) {
      element.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => element.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const handleSectionChange = (sectionId) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  const scrollSidebar = (direction) => {
    const element = document.getElementById('edg-sidebar');
    if (element) {
      element.scrollBy({ top: direction === 'up' ? -200 : 200, behavior: 'smooth' });
    }
  };

  // Classes pour les boutons du menu
  const getButtonClasses = (item, isActive) => {
    if (isActive) {
      if (item.color === 'primary') return 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg';
      if (item.color === 'success') return 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg';
      if (item.color === 'accent') return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg';
      if (item.color === 'warning') return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg';
      if (item.color === 'danger') return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg';
    } else {
      if (item.color === 'primary') return 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20';
      if (item.color === 'success') return 'text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20';
      if (item.color === 'accent') return 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20';
      if (item.color === 'warning') return 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20';
      if (item.color === 'danger') return 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
    }
    return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
  };

  const getIconContainerClasses = (item, isActive) => {
    if (isActive) return 'bg-white/20';
    if (item.color === 'primary') return 'bg-primary-100 dark:bg-primary-900/30';
    if (item.color === 'success') return 'bg-success-100 dark:bg-success-900/30';
    if (item.color === 'accent') return 'bg-purple-100 dark:bg-purple-900/30';
    if (item.color === 'warning') return 'bg-amber-100 dark:bg-amber-900/30';
    if (item.color === 'danger') return 'bg-red-100 dark:bg-red-900/30';
    return 'bg-gray-100 dark:bg-gray-700';
  };

  const getIconClasses = (item, isActive) => {
    if (isActive) return 'text-white';
    if (item.color === 'primary') return 'text-primary-600 dark:text-primary-400';
    if (item.color === 'success') return 'text-success-600 dark:text-success-400';
    if (item.color === 'accent') return 'text-purple-600 dark:text-purple-400';
    if (item.color === 'warning') return 'text-amber-600 dark:text-amber-400';
    if (item.color === 'danger') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Badge count pour certains items
  const getBadgeCount = (itemId) => {
    if (itemId === 'incidents') return alertCounts.incidents || 0;
    if (itemId === 'fraud' || itemId === 'reconciliation') return alertCounts.frauds || 0;
    if (itemId === 'notifications') return alertCounts.alerts || 0;
    return 0;
  };

  // Composant MenuItem réutilisable
  const MenuItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    const badgeCount = getBadgeCount(item.id);

    return (
      <button
        onClick={() => handleSectionChange(item.id)}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group relative ${
          getButtonClasses(item, isActive)
        } ${isActive ? 'scale-105' : 'hover:scale-102'}`}
        style={{ pointerEvents: 'auto', zIndex: 10 }}
        type="button"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${getIconContainerClasses(item, isActive)}`}>
          <Icon className={`w-5 h-5 transition-colors ${getIconClasses(item, isActive)}`} />
        </div>
        <span className="flex-1 text-left truncate">{item.label}</span>
        
        {/* Badge pour les alertes */}
        {badgeCount > 0 && (
          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
            isActive 
              ? 'bg-white text-red-600' 
              : 'bg-red-500 text-white animate-pulse'
          }`}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
        
        {isActive && !badgeCount && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0"></div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* ========== MOBILE: Bouton hamburger flottant ========== */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* ========== MOBILE: Menu plein écran ========== */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header mobile */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">EDG Control</h2>
                  <p className="text-xs text-white/70">{menuItems.length} modules</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Menu items mobile */}
            <div className="p-4 space-y-2">
              {menuItems.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== TABLETTE: Barre horizontale en bas ========== */}
      <nav className="hidden md:flex lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-start gap-1 p-2 min-w-max px-4">
            {menuItems.slice(0, 9).map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const badgeCount = getBadgeCount(item.id);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[70px] ${
                    isActive 
                      ? `${item.color === 'primary' ? 'bg-primary-500' : item.color === 'success' ? 'bg-success-500' : item.color === 'danger' ? 'bg-red-500' : item.color === 'warning' ? 'bg-amber-500' : 'bg-purple-500'} text-white shadow-lg` 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  <span className="text-[10px] mt-1 font-medium truncate max-w-[60px]">
                    {item.label.split(' ')[0]}
                  </span>
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ========== DESKTOP: Sidebar classique ========== */}
      <div className="relative hidden lg:block flex-shrink-0">
        {showScrollTop && (
          <button
            onClick={() => scrollSidebar('up')}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 w-8 h-8 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-all duration-200 hover:scale-110 flex items-center justify-center"
            aria-label="Scroller vers le haut"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}

        {/* Sidebar Desktop */}
        <nav
          id="edg-sidebar"
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-r-2 border-primary-200 dark:border-primary-900 rounded-r-2xl shadow-xl w-64 xl:w-72 h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden scroll-smooth sticky top-20 scrollbar-thin relative z-20"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="p-4 space-y-2">
            {/* Header de la sidebar */}
            <div className="mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 px-3 py-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Centre de Contrôle
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    EDG Supervision
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            {menuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </nav>

        {showScrollBottom && (
          <button
            onClick={() => scrollSidebar('down')}
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 w-8 h-8 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-all duration-200 hover:scale-110 flex items-center justify-center"
            aria-label="Scroller vers le bas"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
}

export default EDGSidebar;
