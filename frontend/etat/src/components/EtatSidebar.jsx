import { 
  LayoutDashboard, BarChart3, TrendingUp, DollarSign, 
  Droplets, FileText, Settings, ChevronUp, ChevronDown, 
  Menu, X, Map, Calendar, Shield, Zap, Building2, Users,
  Home, TrendingDown, Heart, AlertTriangle, Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';

const menuItems = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytique Nationale', icon: BarChart3 },
  { id: 'financial', label: 'Gap Financier', icon: DollarSign },
  { id: 'hydro', label: 'Planification Hydro', icon: Droplets },
  { id: 'rural', label: 'Ravitaillement Rural', icon: Home },
  { id: 'audit', label: 'Audit Performance', icon: TrendingDown },
  { id: 'social', label: 'Impact Social', icon: Heart },
  { id: 'maintenance', label: 'Maintenance HT', icon: AlertTriangle },
  { id: 'geographic', label: 'Cartographie', icon: Map },
  { id: 'reports', label: 'Rapports Ministériels', icon: FileText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

function EtatSidebar({ activeSection, onSectionChange }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const scrollElement = document.getElementById('etat-sidebar-scroll');
      if (scrollElement) {
        setShowScrollTop(scrollElement.scrollTop > 50);
        setShowScrollBottom(scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight > 50);
      }
    };

    const scrollElement = document.getElementById('etat-sidebar-scroll');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => scrollElement.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const handleSectionChange = (sectionId) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  const scrollSidebar = (direction) => {
    const scrollElement = document.getElementById('etat-sidebar-scroll');
    if (scrollElement) {
      scrollElement.scrollBy({ top: direction === 'up' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const getButtonClasses = (item, isActive) => {
    // Design simplifié et professionnel - palette cohérente
    if (isActive) {
      return 'bg-primary-600 text-white shadow-lg';
    } else {
      return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        id="etat-sidebar"
        className={`
          fixed lg:fixed top-0 left-0 z-40
          w-64 h-screen
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo - Fixed */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">SIGE-Guinée</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ministère de l'État</p>
            </div>
          </div>
        </div>

        {/* Scrollable Menu Area */}
        <div className="flex-1 overflow-y-auto relative" id="etat-sidebar-scroll">
          <div className="p-4">
            {/* Scroll button top */}
            {showScrollTop && (
              <button
                onClick={() => scrollSidebar('up')}
                className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                title="Défiler vers le haut"
              >
                <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}

            {/* Menu items */}
            <nav className="space-y-1 pt-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                      transition-all duration-200
                      ${getButtonClasses(item, isActive)}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Scroll button bottom */}
            {showScrollBottom && (
              <button
                onClick={() => scrollSidebar('down')}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                title="Défiler vers le bas"
              >
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

export default EtatSidebar;
