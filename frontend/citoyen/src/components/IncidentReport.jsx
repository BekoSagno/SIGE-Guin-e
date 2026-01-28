import { useState, useEffect, useRef } from 'react';
import { incidentsService, homesService } from '@common/services';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Upload, 
  X, 
  CheckCircle, 
  Loader,
  Home,
  Navigation,
  Globe
} from 'lucide-react';

function IncidentReport({ onReportSuccess }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    incidentType: 'AUTRE',
    homeId: '',
    latitude: null,
    longitude: null,
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (showForm) {
      loadHomes();
      requestLocation();
    }
  }, [showForm]);

  const loadHomes = async () => {
    try {
      const data = await homesService.getHomes();
      setHomes(data.homes || []);
      if (data.homes && data.homes.length > 0) {
        setFormData(prev => ({ ...prev, homeId: data.homes[0].id }));
      }
    } catch (error) {
      console.error('Erreur chargement foyers:', error);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationStatus('success');
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        setLocationStatus('error');
        // Ne pas bloquer le formulaire si la géolocalisation échoue
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La photo ne doit pas dépasser 5MB');
        return;
      }

      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        setError('Le fichier doit être une image');
        return;
      }

      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualLocation = () => {
    const lat = prompt('Latitude (ex: 9.5383):');
    const lng = prompt('Longitude (ex: -13.6574):');
    
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
        setFormData(prev => ({
          ...prev,
          latitude: latNum,
          longitude: lngNum,
        }));
        setLocationStatus('success');
        setError(null);
      } else {
        setError('Coordonnées GPS invalides');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Upload de la photo si elle existe
      let photoUrl = null;
      if (photo) {
        try {
          const uploadResponse = await incidentsService.uploadPhoto(photo);
          photoUrl = uploadResponse.photoUrl;
          
          // Construire l'URL complète si nécessaire (le backend retourne /uploads/filename)
          if (photoUrl && !photoUrl.startsWith('http')) {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            photoUrl = `${API_BASE_URL}${photoUrl}`;
          }
        } catch (uploadError) {
          console.error('Erreur upload photo:', uploadError);
          setError(uploadError.message || 'Erreur lors de l\'upload de la photo');
          setLoading(false);
          return;
        }
      }

      // Créer l'incident avec l'URL de la photo
      const incidentData = {
        description: formData.description.trim(),
        incidentType: formData.incidentType,
        homeId: formData.homeId || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        photoUrl: photoUrl,
      };

      const response = await incidentsService.createIncident(incidentData);
      
      setSuccess(true);
      
      // Réinitialiser le formulaire
      setTimeout(() => {
        resetForm();
        if (onReportSuccess) {
          onReportSuccess(response.incident);
        }
      }, 2000);
    } catch (err) {
      console.error('Erreur création incident:', err);
      setError(err.response?.data?.error || err.message || 'Erreur lors du signalement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      incidentType: 'AUTRE',
      homeId: homes.length > 0 ? homes[0].id : '',
      latitude: null,
      longitude: null,
    });
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
    setSuccess(false);
    setLocationStatus('idle');
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <div className="card animate-fade-in">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Signalement d'Incident</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Signalez un problème sur le réseau électrique</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Signalez une panne, une coupure, une fraude suspectée ou tout autre incident
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <AlertTriangle className="w-5 h-5" />
            <span>Signaler un Incident</span>
          </button>
        </div>
      </div>
    );
  }

  const incidentTypes = [
    { value: 'PANNE', label: 'Panne', icon: AlertTriangle },
    { value: 'COUPURE', label: 'Coupure', icon: AlertTriangle },
    { value: 'FRAUDE_SUSPECTEE', label: 'Fraude Suspectée', icon: AlertTriangle },
    { value: 'AUTRE', label: 'Autre', icon: AlertTriangle },
  ];

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Signaler un Incident</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Décrivez le problème rencontré</p>
          </div>
        </div>
        <button
          onClick={resetForm}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages d'état */}
      {error && (
        <div className="mb-5 p-4 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 rounded-xl animate-slide-down">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-5 p-4 bg-gradient-to-r from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 border-l-4 border-success-500 rounded-xl animate-scale-in">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-success-700 dark:text-success-300">
                Incident signalé avec succès !
              </p>
              <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                Les agents EDG ont été notifiés et traiteront votre demande rapidement.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type d'incident */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Type d'incident *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {incidentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, incidentType: type.value }))}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 font-semibold text-sm ${
                    formData.incidentType === type.value
                      ? 'bg-accent-500 text-white border-accent-500 shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-accent-300 dark:hover:border-accent-700 hover:scale-105'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1.5" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Description détaillée *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            required
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-medium resize-none"
            placeholder="Décrivez le problème rencontré (lieu, circonstances, impact, etc.)"
          />
        </div>

        {/* Foyer concerné (optionnel) */}
        {homes.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Foyer concerné (optionnel)
            </label>
            <select
              value={formData.homeId}
              onChange={(e) => setFormData(prev => ({ ...prev, homeId: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-medium"
            >
              <option value="">Aucun foyer spécifique</option>
              {homes.map((home) => (
                <option key={home.id} value={home.id}>
                  {home.nom} ({home.ville})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Géolocalisation */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Localisation GPS
          </label>
          <div className="flex items-center gap-3">
            {locationStatus === 'loading' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-200 dark:border-primary-800 flex-1">
                <Loader className="w-4 h-4 text-primary-600 dark:text-primary-400 animate-spin" />
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Obtention de la position...
                </span>
              </div>
            )}
            {locationStatus === 'success' && formData.latitude && formData.longitude && (
              <div className="flex items-center gap-2 px-4 py-2 bg-success-50 dark:bg-success-900/20 rounded-lg border-2 border-success-200 dark:border-success-800 flex-1">
                <MapPin className="w-4 h-4 text-success-600 dark:text-success-400" />
                <span className="text-sm font-medium text-success-700 dark:text-success-300 flex-1">
                  {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </span>
              </div>
            )}
            {locationStatus === 'error' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent-50 dark:bg-accent-900/20 rounded-lg border-2 border-accent-200 dark:border-accent-800 flex-1">
                <AlertTriangle className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                <span className="text-sm font-medium text-accent-700 dark:text-accent-300">
                  Géolocalisation non disponible
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationStatus === 'loading'}
              className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Navigation className="w-5 h-5" />
              <span>GPS Auto</span>
            </button>
            <button
              type="button"
              onClick={handleManualLocation}
              className="btn-secondary whitespace-nowrap"
            >
              <Globe className="w-5 h-5" />
              <span>Manuel</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            La géolocalisation permet aux agents EDG de localiser rapidement le problème
          </p>
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Photo (optionnel, max 5MB)
          </label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-xl border-2 border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-colors group"
            >
              <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3 group-hover:text-primary-500 transition-colors" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Cliquez pour ajouter une photo
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Formats acceptés: JPG, PNG (max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || success}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Signalé avec succès !</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                <span>Signaler l'Incident</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={loading || success}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

export default IncidentReport;
