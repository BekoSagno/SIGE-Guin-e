import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Eye, MapPin, Camera, MessageSquare, User } from 'lucide-react';
import { useNotification } from './Notification';

function IncidentsManagement({ incidents, onRefresh }) {
  const notify = useNotification();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const allIncidents = incidents?.length > 0 ? incidents : [
    {
      id: 'inc-1',
      incidentType: 'PANNE',
      description: 'Coupure de courant dans le quartier depuis 2 heures',
      status: 'OPEN',
      priority: 'HIGH',
      home: { nom: 'Quartier Madina', ville: 'Conakry' },
      createdAt: new Date().toISOString(),
      reportedBy: 'Mamadou Diallo',
      hasPhoto: true,
    },
    {
      id: 'inc-2',
      incidentType: 'FRAUDE_SUSPECTEE',
      description: 'Compteur semble avoir été manipulé',
      status: 'INVESTIGATING',
      priority: 'CRITICAL',
      home: { nom: 'Zone Industrielle', ville: 'Conakry' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      reportedBy: 'Agent EDG',
      hasPhoto: true,
    },
    {
      id: 'inc-3',
      incidentType: 'ANOMALIE',
      description: 'Fluctuation de tension fréquente',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      home: { nom: 'Résidence Bambeto', ville: 'Ratoma' },
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      reportedBy: 'Fatoumata Bah',
      hasPhoto: false,
    },
  ];

  const filteredIncidents = filterStatus === 'all'
    ? allIncidents
    : allIncidents.filter(i => i.status === filterStatus);

  const stats = {
    total: allIncidents.length,
    open: allIncidents.filter(i => i.status === 'OPEN').length,
    investigating: allIncidents.filter(i => i.status === 'INVESTIGATING').length,
    resolved: allIncidents.filter(i => i.status === 'RESOLVED').length,
  };

  const handleStatusChange = (incident, newStatus) => {
    notify.success(`Statut mis à jour: ${newStatus}`, {
      title: '✅ Incident mis à jour',
    });
    onRefresh?.();
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'PANNE':
        return { icon: AlertTriangle, color: 'amber', label: 'Panne' };
      case 'FRAUDE_SUSPECTEE':
        return { icon: AlertTriangle, color: 'red', label: 'Fraude' };
      case 'ANOMALIE':
        return { icon: AlertTriangle, color: 'primary', label: 'Anomalie' };
      default:
        return { icon: AlertTriangle, color: 'gray', label: type };
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'OPEN':
        return { badge: 'badge-danger', label: 'Ouvert' };
      case 'INVESTIGATING':
        return { badge: 'badge-warning', label: 'En cours' };
      case 'RESOLVED':
        return { badge: 'badge-success', label: 'Résolu' };
      default:
        return { badge: 'badge-info', label: status };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Gestion des Incidents
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Signalements des citoyens et alertes système
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="danger-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Ouverts</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.open}</p>
        </div>
        <div className="warning-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">En investigation</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.investigating}</p>
        </div>
        <div className="success-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Résolus</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Tous' },
          { value: 'OPEN', label: 'Ouverts' },
          { value: 'INVESTIGATING', label: 'En cours' },
          { value: 'RESOLVED', label: 'Résolus' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === filter.value
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Liste des incidents */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Aucun incident
            </h3>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const typeConfig = getTypeConfig(incident.incidentType);
            const statusConfig = getStatusConfig(incident.status);
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={incident.id}
                className="card hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`}>
                      <TypeIcon className={`w-6 h-6 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={statusConfig.badge}>{statusConfig.label}</span>
                        <span className="text-xs text-gray-500">{typeConfig.label}</span>
                        {incident.hasPhoto && <Camera className="w-4 h-4 text-gray-400" />}
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {incident.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{incident.home?.nom}, {incident.home?.ville}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{incident.reportedBy}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(incident.createdAt).toLocaleDateString('fr-FR')}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedIncident(incident); }}
                      className="btn-secondary text-sm px-3 py-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Détails</span>
                    </button>
                    {incident.status !== 'RESOLVED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(incident, 'RESOLVED'); }}
                        className="btn-success text-sm px-3 py-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Résoudre</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal détail incident */}
      {selectedIncident && (
        <IncidentDetailModal 
          incident={selectedIncident} 
          onClose={() => setSelectedIncident(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function IncidentDetailModal({ incident, onClose, onStatusChange }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Détails de l'incident
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</h4>
            <p className="text-gray-900 dark:text-gray-100">{incident.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Localisation</h4>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {incident.home?.nom}, {incident.home?.ville}
              </p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Signalé par</h4>
              <p className="font-medium text-gray-900 dark:text-gray-100">{incident.reportedBy}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date</h4>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(incident.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Type</h4>
              <p className="font-medium text-gray-900 dark:text-gray-100">{incident.incidentType}</p>
            </div>
          </div>

          {incident.hasPhoto && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Camera className="w-5 h-5" />
                <span>Photo jointe au signalement</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          {incident.status === 'OPEN' && (
            <button 
              onClick={() => { onStatusChange(incident, 'INVESTIGATING'); onClose(); }}
              className="btn-warning"
            >
              Démarrer investigation
            </button>
          )}
          {incident.status !== 'RESOLVED' && (
            <button 
              onClick={() => { onStatusChange(incident, 'RESOLVED'); onClose(); }}
              className="btn-success"
            >
              Marquer comme résolu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentsManagement;
