import { useState, useEffect } from 'react';
import { X, Home, MapPin, Zap, Sun, Grid } from 'lucide-react';

function AddHomeModal({ isOpen, onClose, onSubmit, loading }) {
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('');
  const [type, setType] = useState('EDG');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationError, setLocationError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser le formulaire quand le modal est fermé
      setNom('');
      setVille('');
      setType('EDG');
      setLatitude('');
      setLongitude('');
      setLocationError('');
    }
  }, [isOpen]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setGettingLocation(false);
      },
      (error) => {
        setLocationError('Impossible d\'obtenir votre position. Vous pouvez saisir manuellement.');
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const homeData = {
      nom,
      ville,
      type,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    };

    onSubmit(homeData);
  };

  const homeTypes = [
    { value: 'EDG', label: 'Réseau EDG', icon: Grid, color: 'primary' },
    { value: 'SOLAIRE', label: 'Solaire', icon: Sun, color: 'accent' },
    { value: 'HYBRIDE', label: 'Hybride', icon: Zap, color: 'success' },
  ];

  useEffect(() => {
    if (isOpen) {
      console.log('Modal ouvert - AddHomeModal');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ajouter un Foyer</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nom */}
          <div>
            <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du foyer *
            </label>
            <input
              id="nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex: Villa Diallo"
            />
          </div>

          {/* Ville */}
          <div>
            <label htmlFor="ville" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ville *
            </label>
            <input
              id="ville"
              type="text"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex: Dixinn, Kaloum"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Type d'énergie *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {homeTypes.map((homeTypeItem) => {
                const Icon = homeTypeItem.icon;
                const isSelected = type === homeTypeItem.value;
                
                const getButtonClasses = () => {
                  if (!isSelected) return 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-102';
                  if (homeTypeItem.color === 'primary') return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg scale-105';
                  if (homeTypeItem.color === 'success') return 'border-success-500 bg-success-50 dark:bg-success-900/20 shadow-lg scale-105';
                  if (homeTypeItem.color === 'accent') return 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 shadow-lg scale-105';
                  return 'border-gray-300 dark:border-gray-600';
                };

                const getIconClasses = () => {
                  if (!isSelected) return 'text-gray-400 dark:text-gray-500';
                  if (homeTypeItem.color === 'primary') return 'text-primary-600 dark:text-primary-400';
                  if (homeTypeItem.color === 'success') return 'text-success-600 dark:text-success-400';
                  if (homeTypeItem.color === 'accent') return 'text-accent-600 dark:text-accent-400';
                  return 'text-gray-400 dark:text-gray-500';
                };

                const getLabelClasses = () => {
                  if (!isSelected) return 'text-gray-600 dark:text-gray-400';
                  if (homeTypeItem.color === 'primary') return 'text-primary-700 dark:text-primary-300';
                  if (homeTypeItem.color === 'success') return 'text-success-700 dark:text-success-300';
                  if (homeTypeItem.color === 'accent') return 'text-accent-700 dark:text-accent-300';
                  return 'text-gray-600 dark:text-gray-400';
                };

                return (
                  <button
                    key={homeTypeItem.value}
                    type="button"
                    onClick={() => setType(homeTypeItem.value)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${getButtonClasses()}`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${getIconClasses()}`} />
                    <span className={`text-xs font-semibold ${getLabelClasses()}`}>
                      {homeTypeItem.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Géolocalisation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Localisation <span className="text-gray-400 dark:text-gray-500 text-xs">(optionnel)</span>
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gettingLocation}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                <span>{gettingLocation ? 'Détection...' : 'Détecter ma position'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="latitude" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="9.5383"
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="-13.6574"
                  />
                </div>
              </div>

              {locationError && (
                <p className="text-xs text-accent-600 dark:text-accent-400">{locationError}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !nom || !ville}
              className="flex-1 btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer le Foyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddHomeModal;
