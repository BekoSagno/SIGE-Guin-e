import { useState } from 'react';
import { 
  Search, User, Home, Activity, AlertTriangle, MapPin, 
  Calendar, Zap, TrendingUp, Building, Phone, Mail, Loader,
  CheckCircle, XCircle, Navigation
} from 'lucide-react';
import { sigeIdService } from '@common/services';
import { useNotification } from './Notification';

function SigeIdSearch() {
  const notify = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Veuillez entrer un ID SIGE');
      return;
    }

    // Valider le format
    if (!/^GUI-[A-Z]{3}-\d{5}$/i.test(searchQuery.trim())) {
      setError('Format invalide. Format attendu: GUI-ZONE-NUMERO (ex: GUI-DIX-00123)');
      return;
    }

    setLoading(true);
    setError('');
    setClientData(null);

    try {
      const response = await sigeIdService.searchClient(searchQuery.trim().toUpperCase());
      setClientData(response.client);
    } catch (err) {
      setError(err.response?.data?.error || 'Client non trouvé avec cet ID SIGE');
      setClientData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Recherche par ID SIGE
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Identifiez un client par sa référence unique SIGE-Guinée
        </p>
      </div>

      {/* Formulaire de recherche */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="GUI-DIX-00123"
              className="input pl-10 font-mono"
              pattern="GUI-[A-Z]{3}-\d{5}"
              title="Format: GUI-ZONE-NUMERO (ex: GUI-DIX-00123)"
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">
              Format: GUI-ZONE-NUMERO (ex: GUI-DIX-00123, GUI-KAL-00456)
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>{loading ? 'Recherche...' : 'Rechercher'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-300 flex items-center space-x-2">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </p>
          </div>
        )}
      </div>

      {/* Résultats */}
      {clientData && (
        <div className="space-y-6 animate-fade-in">
          {/* Carte principale client */}
          <div className="card border-l-4 border-primary-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {clientData.nom}
                    </h3>
                    <p className="text-sm font-mono text-primary-600 dark:text-primary-400">
                      {clientData.sigeId}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span>{clientData.email}</span>
                  </div>
                  {clientData.telephone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{clientData.telephone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Inscrit le {new Date(clientData.inscriptionDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card text-center">
              <Home className="w-6 h-6 text-primary-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {clientData.stats.nombreFoyers}
              </p>
              <p className="text-xs text-gray-500">Foyers</p>
            </div>
            <div className="card text-center">
              <Activity className="w-6 h-6 text-success-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {clientData.stats.nombreCompteurs}
              </p>
              <p className="text-xs text-gray-500">Compteurs</p>
            </div>
            <div className="card text-center">
              <Zap className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {clientData.stats.consommationTotaleKwh.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">kWh total</p>
            </div>
            <div className="card text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {clientData.stats.nombreIncidents}
              </p>
              <p className="text-xs text-gray-500">Incidents</p>
            </div>
            <div className="card text-center">
              <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {clientData.stats.derniereConsommation 
                  ? new Date(clientData.stats.derniereConsommation).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Dernière conso</p>
            </div>
          </div>

          {/* Foyers */}
          {clientData.foyers && clientData.foyers.length > 0 && (
            <div className="card">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Foyers ({clientData.foyers.length})</span>
              </h4>
              <div className="space-y-3">
                {clientData.foyers.map((foyer) => (
                  <div
                    key={foyer.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {foyer.nom}
                          </span>
                          <span className="badge-info">{foyer.type}</span>
                          <span className="badge-success">{foyer.ville}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Activity className="w-3 h-3" />
                            <span>{foyer.nombreCompteurs} compteur(s)</span>
                          </span>
                          <span className={`badge ${
                            foyer.statutCompteur === 'ONLINE' ? 'badge-success' : 'badge-danger'
                          }`}>
                            {foyer.statutCompteur}
                          </span>
                        </div>
                        {foyer.location && (
                          <p className="text-xs text-gray-500 mt-2">
                            📍 {foyer.location.lat.toFixed(4)}, {foyer.location.lng.toFixed(4)}
                          </p>
                        )}
                      </div>
                      {foyer.location && (
                        <button
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps?q=${foyer.location.lat},${foyer.location.lng}`,
                              '_blank'
                            );
                          }}
                          className="btn-secondary text-sm px-3 py-2"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incidents récents */}
          {clientData.incidentsRecents && clientData.incidentsRecents.length > 0 && (
            <div className="card">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Incidents récents ({clientData.incidentsRecents.length})</span>
              </h4>
              <div className="space-y-2">
                {clientData.incidentsRecents.map((incident) => (
                  <div
                    key={incident.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {incident.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`badge ${
                            incident.status === 'CLOSED' ? 'badge-success' :
                            incident.status === 'DISPATCHED' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {incident.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(incident.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consommation récente */}
          {clientData.consommationRecente && clientData.consommationRecente.length > 0 && (
            <div className="card">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Consommation (30 derniers jours)</span>
              </h4>
              <div className="space-y-2">
                {clientData.consommationRecente.slice(0, 10).map((conso, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(conso.date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {conso.consommationKwh.toFixed(2)} kWh
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SigeIdSearch;
