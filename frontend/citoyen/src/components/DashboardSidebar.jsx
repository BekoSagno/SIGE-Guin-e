import { Home, Users, ArrowRight, Zap, Activity, AlertTriangle, Wrench, Snowflake, ChevronUp, ChevronDown, Battery, Clock, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const menuItems = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Home, color: 'primary' },
  { id: 'family', label: 'Gestion Familiale', icon: Users, color: 'primary' },
  { id: 'transfer', label: 'Transfert d\'Énergie', icon: ArrowRight, color: 'accent' },
  { id: 'pairing', label: 'Appairage IoT', icon: Zap, color: 'success' },
  { id: 'smartsave', label: 'Smart Save', icon: Snowflake, color: 'success' },
  { id: 'scheduler', label: 'Programmation', icon: Clock, color: 'primary' },
  { id: 'economymode', label: 'Mode Économie', icon: Battery, color: 'success' },
  { id: 'maintenance', label: 'Maintenance IA', icon: Wrench, color: 'accent' },
  { id: 'analytics', label: 'Analyse NILM', icon: Activity, color: 'primary' },
  { id: 'incidents', label: 'Signalements', icon: AlertTriangle, color: 'accent' },
];

function DashboardSidebar({ activeSection, onSectionChange }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const element = document.getElementById('dashboard-sidebar');
      if (element) {
        setShowScrollTop(element.scrollTop > 50);
        setShowScrollBottom(element.scrollHeight - element.scrollTop - element.clientHeight > 50);
      }
    };

    const element = document.getElementById('dashboard-sidebar');
    if (element) {
      element.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => element.removeEventListener('scroll', checkScroll);
    }
  }, []);

  // Fermer le menu mobile quand on change de section
  const handleSectionChange = (sectionId) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  const scrollSidebar = (direction) => {
    const element = document.getElementById('dashboard-sidebar');
    if (element) {
      element.scrollBy({ top: direction === 'up' ? -200 : 200, behavior: 'smooth' });
    }
  };

  // Classes pour les boutons du menu
  const getButtonClasses = (item, isActive) => {
    if (isActive) {
      if (item.color === 'primary') return 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg';
      if (item.color === 'success') return 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg';
      if (item.color === 'accent') return 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg';
    } else {
      if (item.color === 'primary') return 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20';
      if (item.color === 'success') return 'text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20';
      if (item.color === 'accent') return 'text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20';
    }
    return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
  };

  const getIconContainerClasses = (item, isActive) => {
    if (isActive) return 'bg-white/20';
    if (item.color === 'primary') return 'bg-primary-100 dark:bg-primary-900/30';
    if (item.color === 'success') return 'bg-success-100 dark:bg-success-900/30';
    if (item.color === 'accent') return 'bg-accent-100 dark:bg-accent-900/30';
    return 'bg-gray-100 dark:bg-gray-700';
  };

  const getIconClasses = (item, isActive) => {
    if (isActive) return 'text-white';
    if (item.color === 'primary') return 'text-primary-600 dark:text-primary-400';
    if (item.color === 'success') return 'text-success-600 dark:text-success-400';
    if (item.color === 'accent') return 'text-accent-600 dark:text-accent-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Composant MenuItem réutilisable
  const MenuItem = ({ item, isCompact = false }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    return (
      <button
        onClick={() => handleSectionChange(item.id)}
        className={`w-full flex items-center ${isCompact ? 'space-x-2 px-3 py-2' : 'space-x-3 px-4 py-3'} rounded-xl transition-all duration-200 font-semibold text-sm group ${
          getButtonClasses(item, isActive)
        } ${isActive ? 'scale-105' : 'hover:scale-102'}`}
      >
        <div className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${getIconContainerClasses(item, isActive)}`}>
          <Icon className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} transition-colors ${getIconClasses(item, isActive)}`} />
        </div>
        <span className="flex-1 text-left truncate">{item.label}</span>
        {isActive && (
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
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Menu
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {menuItems.length} fonctionnalités
                </p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[70px] ${
                    isActive 
                      ? `${item.color === 'primary' ? 'bg-primary-500' : item.color === 'success' ? 'bg-success-500' : 'bg-accent-500'} text-white shadow-lg` 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  <span className="text-[10px] mt-1 font-medium truncate max-w-[60px]">
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ========== DESKTOP: Sidebar classique ========== */}
      <div className="relative hidden lg:block flex-shrink-0">
        {/* Flèche haut - scroll up */}
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
          id="dashboard-sidebar"
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-r-2 border-primary-200 dark:border-primary-900 rounded-r-2xl shadow-xl w-64 xl:w-72 h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden scroll-smooth sticky top-20"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(59, 130, 246, 0.5) transparent',
          }}
        >
          <div className="p-4 space-y-2">
            {/* Header de la sidebar */}
            <div className="mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-3 py-2">
                Fonctionnalités
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 px-3">
                {menuItems.length} modules disponibles
              </p>
            </div>

            {/* Menu items */}
            {menuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </nav>

        {/* Flèche bas - scroll down */}
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

export default DashboardSidebar;
