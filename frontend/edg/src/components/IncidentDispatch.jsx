import { useState, useEffect } from 'react';
import { 
  AlertTriangle, MapPin, Camera, Clock, User, Phone, CheckCircle, 
  Send, Navigation, Eye, MessageSquare, Truck, XCircle, ChevronRight,
  Image, Calendar, Filter, Search, Bell, UserCheck
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

// Données simulées des incidents citoyens
const MOCK_INCIDENTS = [
  {
    id: 'INC-2024-001',
    type: 'PANNE',
    priority: 'HIGH',
    status: 'OPEN',
    description: 'Poteau électrique tombé après la pluie, fils à découvert',
    reportedBy: {
      name: 'Mamadou Diallo',
      phone: '+224 621 00 00 01',
      email: 'mamadou@test.com',
    },
    location: {
      address: 'Rue 45, Dixinn Centre',
      lat: 9.5380,
      lng: -13.6750,
      zone: 'Dixinn',
    },
    photos: [
      { id: 1, url: 'https://via.placeholder.com/400x300/ef4444/ffffff?text=Poteau+Tombé', caption: 'Vue générale' },
      { id: 2, url: 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Fils+Exposés', caption: 'Fils à découvert' },
    ],
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    assignedTeam: null,
    estimatedResolution: null,
    updates: [],
  },
  {
    id: 'INC-2024-002',
    type: 'COUPURE',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    description: 'Coupure de courant depuis 3 heures dans tout le quartier',
    reportedBy: {
      name: 'Fatoumata Bah',
      phone: '+224 621 00 00 02',
      email: 'fatoumata@test.com',
    },
    location: {
      address: 'Avenue Fidel Castro, Ratoma',
      lat: 9.5850,
      lng: -13.6150,
      zone: 'Ratoma',
    },
    photos: [],
    createdAt: new Date(Date.now() - 10800000).toISOString(), // 3h ago
    assignedTeam: {
      id: 'TEAM-001',
      name: 'Équipe Technique Alpha',
      leader: 'Ibrahim Camara',
      phone: '+224 622 00 00 01',
      members: 4,
    },
    estimatedResolution: '2h',
    updates: [
      { time: new Date(Date.now() - 3600000).toISOString(), message: 'Équipe en route', author: 'Système' },
      { time: new Date(Date.now() - 1800000).toISOString(), message: 'Arrivée sur site, diagnostic en cours', author: 'Ibrahim Camara' },
    ],
  },
  {
    id: 'INC-2024-003',
    type: 'FRAUDE',
    priority: 'HIGH',
    status: 'OPEN',
    description: 'Branchement clandestin suspecté dans le voisinage',
    reportedBy: {
      name: 'Ibrahima Sow',
      phone: '+224 621 00 00 03',
      email: 'ibrahima@test.com',
    },
    location: {
      address: 'Carrefour Matoto, Zone industrielle',
      lat: 9.6150,
      lng: -13.5750,
      zone: 'Matoto',
    },
    photos: [
      { id: 3, url: 'https://via.placeholder.com/400x300/dc2626/ffffff?text=Branchement+Suspect', caption: 'Câble suspect' },
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2h ago
    assignedTeam: null,
    estimatedResolution: null,
    updates: [],
  },
  {
    id: 'INC-2024-004',
    type: 'PANNE',
    priority: 'LOW',
    status: 'RESOLVED',
    description: 'Compteur qui disjoncte fréquemment',
    reportedBy: {
      name: 'Aissatou Barry',
      phone: '+224 621 00 00 04',
      email: 'aissatou@test.com',
    },
    location: {
      address: 'Quartier Madina, Kaloum',
      lat: 9.5100,
      lng: -13.7100,
      zone: 'Kaloum',
    },
    photos: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    assignedTeam: {
      id: 'TEAM-002',
      name: 'Équipe Technique Beta',
      leader: 'Oumar Camara',
      phone: '+224 622 00 00 02',
      members: 3,
    },
    estimatedResolution: null,
    resolvedAt: new Date(Date.now() - 43200000).toISOString(),
    updates: [
      { time: new Date(Date.now() - 72000000).toISOString(), message: 'Équipe assignée', author: 'Système' },
      { time: new Date(Date.now() - 50400000).toISOString(), message: 'Intervention en cours', author: 'Oumar Camara' },
      { time: new Date(Date.now() - 43200000).toISOString(), message: 'Problème résolu - Disjoncteur remplacé', author: 'Oumar Camara' },
    ],
  },
];

// Équipes disponibles
const AVAILABLE_TEAMS = [
  { id: 'TEAM-001', name: 'Équipe Technique Alpha', leader: 'Ibrahim Camara', phone: '+224 622 00 00 01', members: 4, status: 'BUSY' },
  { id: 'TEAM-002', name: 'Équipe Technique Beta', leader: 'Oumar Camara', phone: '+224 622 00 00 02', members: 3, status: 'AVAILABLE' },
  { id: 'TEAM-003', name: 'Équipe Technique Gamma', leader: 'Mamadou Sylla', phone: '+224 622 00 00 03', members: 4, status: 'AVAILABLE' },
  { id: 'TEAM-004', name: 'Équipe Fraude', leader: 'Amadou Balde', phone: '+224 622 00 00 04', members: 2, status: 'AVAILABLE' },
];

function IncidentDispatch() {
  const notify = useNotification();
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const handleAssignTeam = (incident, team) => {
    setConfirmDialog({
      isOpen: true,
      title: `Assigner ${team.name} ?`,
      message: `L'équipe sera notifiée et le citoyen ${incident.reportedBy.name} recevra une notification de prise en charge.`,
      type: 'info',
      confirmText: 'Assigner',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        setShowAssignModal(false);
        
        // Mettre à jour l'incident
        setIncidents(prev => prev.map(inc => {
          if (inc.id === incident.id) {
            return {
              ...inc,
              status: 'IN_PROGRESS',
              assignedTeam: team,
              estimatedResolution: '2h',
              updates: [
                ...inc.updates,
                { time: new Date().toISOString(), message: `Équipe ${team.name} assignée`, author: 'Système' },
              ],
            };
          }
          return inc;
        }));

        notify.success(`Équipe ${team.name} assignée à l'incident ${incident.id}`, {
          title: '🚚 Équipe en route',
          duration: 5000,
          actions: [
            { label: 'Notifier citoyen', primary: true, onClick: () => notifyCitizen(incident) },
          ],
        });
      },
    });
  };

  const notifyCitizen = (incident) => {
    notify.info(`Notification envoyée à ${incident.reportedBy.name}`, {
      title: '📱 Push Notification',
    });
  };

  const handleResolve = (incident) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clôturer cet incident ?',
      message: 'Le citoyen sera notifié que le problème a été résolu.',
      type: 'info',
      confirmText: 'Clôturer',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        setSelectedIncident(null);
        
        setIncidents(prev => prev.map(inc => {
          if (inc.id === incident.id) {
            return {
              ...inc,
              status: 'RESOLVED',
              resolvedAt: new Date().toISOString(),
              updates: [
                ...inc.updates,
                { time: new Date().toISOString(), message: 'Incident résolu et clôturé', author: 'Système' },
              ],
            };
          }
          return inc;
        }));

        notify.success(`Incident ${incident.id} clôturé avec succès`, {
          title: '✅ Résolu',
        });
      },
    });
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchesType = filterType === 'all' || inc.type === filterType;
    const matchesSearch = searchQuery === '' || 
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.reportedBy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'OPEN').length,
    inProgress: incidents.filter(i => i.status === 'IN_PROGRESS').length,
    resolved: incidents.filter(i => i.status === 'RESOLVED').length,
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'PANNE': return { icon: AlertTriangle, color: 'amber', label: 'Panne' };
      case 'COUPURE': return { icon: XCircle, color: 'red', label: 'Coupure' };
      case 'FRAUDE': return { icon: AlertTriangle, color: 'purple', label: 'Fraude suspectée' };
      default: return { icon: AlertTriangle, color: 'gray', label: type };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'HIGH': return { badge: 'badge-danger', label: 'Urgent' };
      case 'MEDIUM': return { badge: 'badge-warning', label: 'Moyen' };
      default: return { badge: 'badge-info', label: 'Bas' };
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'OPEN': return { badge: 'badge-danger', label: 'Ouvert', color: 'red' };
      case 'IN_PROGRESS': return { badge: 'badge-warning', label: 'En cours', color: 'amber' };
      case 'RESOLVED': return { badge: 'badge-success', label: 'Résolu', color: 'success' };
      default: return { badge: 'badge-info', label: status, color: 'gray' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Console de Dispatch
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des signalements citoyens et interventions terrain
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="badge-danger animate-pulse">{stats.open} nouveaux</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total incidents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="danger-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Ouverts</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.open}</p>
        </div>
        <div className="warning-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">En cours</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
        </div>
        <div className="success-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Résolus</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un incident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Tous les statuts</option>
              <option value="OPEN">Ouverts</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="RESOLVED">Résolus</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Tous les types</option>
              <option value="PANNE">Panne</option>
              <option value="COUPURE">Coupure</option>
              <option value="FRAUDE">Fraude</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des incidents */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Aucun incident correspondant
            </h3>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const typeConfig = getTypeConfig(incident.type);
            const priorityConfig = getPriorityConfig(incident.priority);
            const statusConfig = getStatusConfig(incident.status);
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={incident.id}
                className={`card border-l-4 border-${statusConfig.color}-500 hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`}>
                      <TypeIcon className={`w-6 h-6 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-primary-600 dark:text-primary-400">{incident.id}</span>
                        <span className={statusConfig.badge}>{statusConfig.label}</span>
                        <span className={priorityConfig.badge}>{priorityConfig.label}</span>
                        {incident.photos.length > 0 && (
                          <span className="badge-info flex items-center space-x-1">
                            <Camera className="w-3 h-3" />
                            <span>{incident.photos.length}</span>
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                        {incident.description}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{incident.reportedBy.name}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{incident.location.zone}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{getTimeAgo(incident.createdAt)}</span>
                        </span>
                      </div>

                      {incident.assignedTeam && (
                        <div className="flex items-center space-x-2 mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                          <Truck className="w-4 h-4 text-primary-500" />
                          <span className="text-sm text-primary-700 dark:text-primary-300">
                            {incident.assignedTeam.name} - ETA: {incident.estimatedResolution}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 lg:flex-shrink-0">
                    {incident.status === 'OPEN' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIncidentToAssign(incident); setShowAssignModal(true); }}
                        className="btn-primary text-sm px-3 py-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Assigner</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedIncident(incident); }}
                      className="btn-secondary text-sm px-3 py-2"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal détails incident */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onAssign={() => { setIncidentToAssign(selectedIncident); setShowAssignModal(true); }}
          onResolve={() => handleResolve(selectedIncident)}
          onNotify={() => notifyCitizen(selectedIncident)}
        />
      )}

      {/* Modal assignation équipe */}
      {showAssignModal && incidentToAssign && (
        <AssignTeamModal
          incident={incidentToAssign}
          teams={AVAILABLE_TEAMS}
          onClose={() => { setShowAssignModal(false); setIncidentToAssign(null); }}
          onAssign={(team) => handleAssignTeam(incidentToAssign, team)}
        />
      )}

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
}

function IncidentDetailModal({ incident, onClose, onAssign, onResolve, onNotify }) {
  const statusConfig = incident.status === 'OPEN' ? 'red' : incident.status === 'IN_PROGRESS' ? 'amber' : 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 bg-gradient-to-r from-${statusConfig}-500 to-${statusConfig}-600`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 font-mono">{incident.id}</p>
              <h3 className="text-xl font-bold text-white mt-1">{incident.description}</h3>
            </div>
            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-white/20 text-white">
              {incident.status}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Photos */}
          {incident.photos.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center space-x-2">
                <Camera className="w-5 h-5 text-primary-500" />
                <span>Photos jointes ({incident.photos.length})</span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {incident.photos.map((photo) => (
                  <div key={photo.id} className="relative rounded-xl overflow-hidden">
                    <img src={photo.url} alt={photo.caption} className="w-full h-48 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-2">
                      {photo.caption}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center space-x-2">
                <User className="w-4 h-4 text-primary-500" />
                <span>Signalé par</span>
              </h5>
              <p className="text-gray-900 dark:text-gray-100">{incident.reportedBy.name}</p>
              <p className="text-sm text-gray-500">{incident.reportedBy.phone}</p>
              <p className="text-sm text-gray-500">{incident.reportedBy.email}</p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                <span>Localisation</span>
              </h5>
              <p className="text-gray-900 dark:text-gray-100">{incident.location.address}</p>
              <p className="text-sm text-gray-500">{incident.location.zone}</p>
              <p className="text-xs text-gray-400 mt-1">
                GPS: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Équipe assignée */}
          {incident.assignedTeam && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <h5 className="font-semibold text-primary-800 dark:text-primary-200 mb-2 flex items-center space-x-2">
                <Truck className="w-4 h-4" />
                <span>Équipe assignée</span>
              </h5>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-900 dark:text-primary-100">{incident.assignedTeam.name}</p>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    Chef: {incident.assignedTeam.leader} • {incident.assignedTeam.members} membres
                  </p>
                </div>
                <a href={`tel:${incident.assignedTeam.phone}`} className="btn-primary text-sm px-3 py-2">
                  <Phone className="w-4 h-4" />
                  <span>Appeler</span>
                </a>
              </div>
            </div>
          )}

          {/* Timeline des mises à jour */}
          {incident.updates.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Historique</h4>
              <div className="space-y-3">
                {incident.updates.map((update, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{update.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(update.time).toLocaleString('fr-FR')} • {update.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Fermer</button>
          <button onClick={onNotify} className="btn-secondary">
            <Bell className="w-4 h-4" />
            <span>Notifier citoyen</span>
          </button>
          <button className="btn-primary">
            <Navigation className="w-4 h-4" />
            <span>Ouvrir GPS</span>
          </button>
          {incident.status === 'OPEN' && (
            <button onClick={onAssign} className="btn-warning">
              <Truck className="w-4 h-4" />
              <span>Assigner équipe</span>
            </button>
          )}
          {incident.status === 'IN_PROGRESS' && (
            <button onClick={onResolve} className="btn-success">
              <CheckCircle className="w-4 h-4" />
              <span>Clôturer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignTeamModal({ incident, teams, onClose, onAssign }) {
  const availableTeams = teams.filter(t => t.status === 'AVAILABLE');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Assigner une équipe
          </h3>
          <p className="text-sm text-gray-500 mt-1">Incident: {incident.id}</p>
        </div>
        
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {availableTeams.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune équipe disponible</p>
            </div>
          ) : (
            availableTeams.map((team) => (
              <div 
                key={team.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => onAssign(team)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                    {team.members}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{team.name}</p>
                    <p className="text-sm text-gray-500">Chef: {team.leader}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="badge-success">Disponible</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="w-full btn-secondary">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// Fonction utilitaire pour le temps écoulé
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${days}j`;
}

export default IncidentDispatch;
