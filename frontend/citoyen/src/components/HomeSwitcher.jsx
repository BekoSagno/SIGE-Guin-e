import { useState, useEffect } from 'react';
import { homesService } from '@common/services';
import { Home, ChevronDown } from 'lucide-react';

function HomeSwitcher({ selectedHomeId, onHomeChange }) {
  const [homes, setHomes] = useState([]);
  const [selectedHome, setSelectedHome] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomes();
  }, []);

  useEffect(() => {
    if (selectedHomeId && homes.length > 0) {
      const home = homes.find((h) => h.id === selectedHomeId);
      setSelectedHome(home || homes[0]);
      if (home) {
        onHomeChange(home);
      }
    } else if (homes.length > 0 && !selectedHome) {
      setSelectedHome(homes[0]);
      onHomeChange(homes[0]);
    }
  }, [selectedHomeId, homes]);

  const loadHomes = async () => {
    try {
      const data = await homesService.getHomes();
      setHomes(data.homes || []);
    } catch (error) {
      console.error('Erreur chargement foyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (home) => {
    setSelectedHome(home);
    setIsOpen(false);
    onHomeChange(home);
  };

  if (loading) {
    return <div className="text-gray-600">Chargement...</div>;
  }

  if (homes.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm border-2 border-primary-200 dark:border-primary-800 rounded-lg sm:rounded-xl hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-lg transition-all duration-200 font-semibold text-gray-900 dark:text-gray-100"
      >
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
          <Home className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <span className="font-bold text-xs sm:text-sm lg:text-base truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">
          {selectedHome?.nom || 'Sélectionner'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600 dark:text-primary-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10 bg-black/10 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 sm:mt-3 w-64 sm:w-72 lg:w-80 bg-white dark:bg-gray-800 border-2 border-primary-200 dark:border-primary-800 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in-scale">
            <div className="p-2 sm:p-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {homes.map((home, index) => (
                <button
                  key={home.id}
                  onClick={() => handleSelect(home)}
                  className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 mb-1.5 sm:mb-2 last:mb-0 ${
                    selectedHome?.id === home.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <div className="font-bold text-sm sm:text-base truncate">{home.nom}</div>
                    {selectedHome?.id === home.id && (
                      <div className="w-2 h-2 bg-white rounded-full flex-shrink-0 ml-2"></div>
                    )}
                  </div>
                  <div className={`text-xs sm:text-sm truncate ${selectedHome?.id === home.id ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                    {home.ville} • {home.type}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default HomeSwitcher;
