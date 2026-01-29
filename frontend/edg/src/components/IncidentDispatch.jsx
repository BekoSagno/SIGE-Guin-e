import { useState, useEffect } from 'react';
import { 
  AlertTriangle, MapPin, Camera, Clock, User, Phone, CheckCircle, 
  Send, Navigation, Eye, MessageSquare, Truck, XCircle, ChevronRight,
  Image, Calendar, Filter, Search, Bell, UserCheck, X, Mail
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';
import { incidentsService, notificationService } from '@common/services';

// Données simulées des incidents citoyens (fallback)
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
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [activeTab, setActiveTab] = useState('all'); // all, open, alerts

  // Charger les incidents depuis l'API
  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await incidentsService.getIncidents();
      const apiIncidents = (data.incidents || []).map(inc => ({
        id: inc.id,
        type: inc.incidentType || 'AUTRE',
        priority: inc.incidentType === 'FRAUDE_SUSPECTEE' ? 'HIGH' : 
                 inc.incidentType === 'PANNE' || inc.incidentType === 'COUPURE' ? 'MEDIUM' : 'LOW',
        status: inc.status || 'OPEN',
        description: inc.description,
        reportedBy: {
          name: inc.reporter?.nom || 'Citoyen anonyme',
          phone: inc.reporter?.telephone || '',
          email: inc.reporter?.email || '',
        },
        location: {
          address: inc.home?.ville || 'Non spécifié',
          lat: inc.latitude,
          lng: inc.longitude,
          zone: inc.home?.ville || '',
        },
        photos: inc.photoUrl ? [{ id: 1, url: `http://localhost:5000${inc.photoUrl}`, caption: 'Photo incident' }] : [],
        createdAt: inc.createdAt,
        updatedAt: inc.updatedAt,
        closedAt: inc.closedAt,
        assignedTeam: inc.status === 'DISPATCHED' ? { id: 'TEAM-001', name: 'Équipe assignée' } : null,
        estimatedResolution: null,
        updates: [],
      }));
      setIncidents(apiIncidents.length > 0 ? apiIncidents : MOCK_INCIDENTS);
    } catch (error) {
      console.error('Erreur chargement incidents:', error);
      setIncidents(MOCK_INCIDENTS); // Fallback sur données mockées
    } finally {
      setLoading(false);
    }
  };

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
    // Filtrer par onglet actif
    if (activeTab === 'open' && inc.status !== 'OPEN') return false;
    if (activeTab === 'alerts' && inc.status !== 'OPEN') return false;
    
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchesType = filterType === 'all' || inc.type === filterType;
    const matchesSearch = searchQuery === '' || 
      (inc.description && inc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.reportedBy?.name && inc.reportedBy.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.location?.address && inc.location.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.location?.zone && inc.location.zone.toLowerCase().includes(searchQuery.toLowerCase()));
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
      case 'FRAUDE_SUSPECTEE': 
      case 'FRAUDE': return { icon: AlertTriangle, color: 'purple', label: 'Fraude suspectée' };
      default: return { icon: AlertTriangle, color: 'gray', label: type || 'AUTRE' };
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
      case 'IN_PROGRESS': 
      case 'DISPATCHED': return { badge: 'badge-warning', label: 'En cours', color: 'amber' };
      case 'RESOLVED': 
      case 'CLOSED': return { badge: 'badge-success', label: 'Résolu', color: 'success' };
      default: return { badge: 'badge-info', label: status, color: 'gray' };
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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

      {/* Onglets - Layout responsive */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === 'all'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Tous ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('open')}
          className={`px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === 'open'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          En attente ({stats.open})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors relative whitespace-nowrap flex-shrink-0 ${
            activeTab === 'alerts'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Alertes
          {stats.open > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {stats.open > 9 ? '9+' : stats.open}
            </span>
          )}
        </button>
      </div>

      {/* Filtres - Layout optimisé */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un incident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 sm:pl-10 w-full text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 hidden sm:block" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="OPEN">Ouvert</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="DISPATCHED">Assigné</option>
              <option value="RESOLVED">Résolu</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]"
            >
              <option value="all">Tous les types</option>
              <option value="PANNE">Panne</option>
              <option value="COUPURE">Coupure</option>
              <option value="FRAUDE_SUSPECTEE">Fraude</option>
              <option value="AUTRE">Autre</option>
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
                className={`card border-l-4 ${
                  statusConfig.color === 'red' ? 'border-red-500' :
                  statusConfig.color === 'amber' ? 'border-amber-500' :
                  'border-green-500'
                } hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                      typeConfig.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      typeConfig.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                      typeConfig.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <TypeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                        typeConfig.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                        typeConfig.color === 'red' ? 'text-red-600 dark:text-red-400' :
                        typeConfig.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                        <span className="font-mono text-xs sm:text-sm text-primary-600 dark:text-primary-400 truncate max-w-[120px] sm:max-w-none">
                          {incident.id}
                        </span>
                        <span className={statusConfig.badge}>{statusConfig.label}</span>
                        <span className={priorityConfig.badge}>{priorityConfig.label}</span>
                        {incident.photos && incident.photos.length > 0 && (
                          <span className="badge-info flex items-center gap-1 text-xs">
                            <Camera className="w-3 h-3" />
                            <span>{incident.photos.length}</span>
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 line-clamp-2 break-words">
                        {incident.description}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">{incident.reportedBy.name}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{incident.location.zone || 'Non spécifié'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{getTimeAgo(incident.createdAt)}</span>
                        </span>
                      </div>

                      {incident.assignedTeam && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                          <Truck className="w-3 h-3 sm:w-4 sm:h-4 text-primary-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-primary-700 dark:text-primary-300 truncate">
                            {incident.assignedTeam.name}
                            {incident.estimatedResolution && ` - ETA: ${incident.estimatedResolution}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    {incident.status === 'OPEN' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIncidentToAssign(incident); setShowAssignModal(true); }}
                        className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
                      >
                        <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Assigner</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedIncident(incident); }}
                      className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                      title="Voir détails"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
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
  const getStatusColor = () => {
    if (incident.status === 'OPEN') return 'from-red-500 to-red-600';
    if (incident.status === 'IN_PROGRESS' || incident.status === 'DISPATCHED') return 'from-amber-500 to-amber-600';
    return 'from-green-500 to-green-600';
  };

  // Masquer la sidebar quand le modal est ouvert
  useEffect(() => {
    // Sélectionner la sidebar (plusieurs sélecteurs possibles)
    const sidebar = document.querySelector('nav[class*="Sidebar"], nav[class*="sidebar"], [id*="sidebar"], [id*="Sidebar"]') ||
                    document.querySelector('aside') ||
                    document.querySelector('[class*="sidebar"]');
    
    // Masquer la sidebar
    if (sidebar) {
      sidebar.style.display = 'none';
    }
    
    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restaurer la sidebar
      if (sidebar) {
        sidebar.style.display = '';
      }
      // Restaurer le scroll
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-scale overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header élégant avec bouton fermer */}
        <div className={`relative p-5 bg-gradient-to-r ${getStatusColor()} flex-shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all hover:scale-110 z-10 shadow-lg"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-start justify-between gap-4 pr-12">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-white/20 text-white/90 backdrop-blur-sm">
                  {incident.id}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/25 text-white backdrop-blur-sm">
                  {incident.status === 'OPEN' ? 'OUVERT' : incident.status === 'IN_PROGRESS' || incident.status === 'DISPATCHED' ? 'EN COURS' : 'RÉSOLU'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {incident.description}
              </h3>
            </div>
          </div>
        </div>
        
        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Photos - Design élégant */}
          {incident.photos && incident.photos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Camera className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  Photos jointes <span className="text-sm text-gray-500 dark:text-gray-400">({incident.photos.length})</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {incident.photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                    <img 
                      src={photo.url} 
                      alt={photo.caption || 'Photo incident'} 
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-3">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informations - Design professionnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h5 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  Signalé par
                </h5>
              </div>
              <div className="space-y-2 pl-12">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {incident.reportedBy?.name || 'Non spécifié'}
                </p>
                {incident.reportedBy?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${incident.reportedBy.phone}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      {incident.reportedBy.phone}
                    </a>
                  </div>
                )}
                {incident.reportedBy?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${incident.reportedBy.email}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate">
                      {incident.reportedBy.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h5 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  Localisation
                </h5>
              </div>
              <div className="space-y-2 pl-12">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {incident.location?.address || incident.location?.zone || 'Non spécifié'}
                </p>
                {incident.location?.zone && incident.location?.address !== incident.location?.zone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Zone: {incident.location.zone}
                  </p>
                )}
                {incident.location?.lat && incident.location?.lng && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-200/50 dark:bg-gray-700/50 px-2 py-1 rounded">
                    <Navigation className="w-3 h-3" />
                    <span>{incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Équipe assignée - Design élégant */}
          {incident.assignedTeam && (
            <div className="p-5 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/30 rounded-xl border border-primary-200 dark:border-primary-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-primary-200 dark:bg-primary-800/50 rounded-lg">
                  <Truck className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                </div>
                <h5 className="font-semibold text-base text-primary-900 dark:text-primary-100">
                  Équipe assignée
                </h5>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pl-12">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-primary-900 dark:text-primary-100 mb-1">
                    {incident.assignedTeam.name}
                  </p>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    Chef: {incident.assignedTeam.leader} • {incident.assignedTeam.members} membres
                  </p>
                </div>
                {incident.assignedTeam.phone && (
                  <a 
                    href={`tel:${incident.assignedTeam.phone}`} 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Appeler</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Timeline des mises à jour - Design professionnel */}
          {incident.updates && incident.updates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  Historique
                </h4>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-primary-200 dark:border-primary-700">
                {incident.updates.map((update, idx) => (
                  <div key={idx} className="relative -left-[9px]">
                    <div className="absolute -left-2 top-2 w-4 h-4 bg-primary-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    <div className="ml-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                        {update.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(update.time).toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} • {update.author}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer avec actions - Design professionnel */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              Créé le {new Date(incident.createdAt).toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {incident.location?.lat && incident.location?.lng && (
              <button 
                onClick={() => window.open(`https://www.google.com/maps?q=${incident.location.lat},${incident.location.lng}`, '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span>GPS</span>
              </button>
            )}
            {incident.status === 'OPEN' && (
              <>
                <button 
                  onClick={onNotify} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notifier</span>
                </button>
                <button 
                  onClick={onAssign} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <Truck className="w-4 h-4" />
                  <span>Assigner</span>
                </button>
              </>
            )}
            {(incident.status === 'IN_PROGRESS' || incident.status === 'DISPATCHED') && (
              <button 
                onClick={onResolve} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Résoudre</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Fermer</span>
            </button>
          </div>
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
