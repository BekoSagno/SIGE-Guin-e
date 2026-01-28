import { useState, useEffect } from 'react';
import { 
  ClipboardList, UserPlus, MapPin, Clock, CheckCircle, XCircle,
  AlertTriangle, Search, Filter, Eye, Navigation, Camera, FileText,
  Target, TrendingUp, Award, Calendar, Send, UserCheck, Zap,
  ArrowRight, Check, X, Loader
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

// Données simulées des tâches
const MOCK_TASKS = [
  {
    id: 'TASK-001',
    taskNumber: 'TASK-20250121-001',
    type: 'INCIDENT',
    priority: 'HIGH',
    status: 'ASSIGNED',
    location: { lat: 9.5380, lng: -13.6750, address: 'Rue 45, Dixinn Centre' },
    description: 'Poteau électrique tombé après la pluie, fils à découvert',
    assignedTo: { nom: 'Mamadou Sylla', email: 'mamadou.sylla@edg.gn' },
    assignedBy: 'Ibrahim Camara',
    assignedAt: new Date(Date.now() - 1800000).toISOString(),
    estimatedDuration: 120,
    incident: { id: 'INC-001', description: 'Poteau électrique tombé' },
  },
  {
    id: 'TASK-002',
    taskNumber: 'TASK-20250121-002',
    type: 'AUDIT',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    location: { lat: 9.5850, lng: -13.6150, address: 'Avenue Fidel Castro, Ratoma' },
    description: 'Audit fraude - Branchement clandestin suspecté',
    assignedTo: { nom: 'Amadou Diallo', email: 'amadou.diallo@edg.gn' },
    assignedBy: 'Ibrahim Camara',
    assignedAt: new Date(Date.now() - 3600000).toISOString(),
    acceptedAt: new Date(Date.now() - 3300000).toISOString(),
    startedAt: new Date(Date.now() - 3000000).toISOString(),
    estimatedDuration: 180,
    auditTicket: { id: 'AUD-001', ticketNumber: 'AUD-20250121-001' },
  },
  {
    id: 'TASK-003',
    taskNumber: 'TASK-20250120-015',
    type: 'MAINTENANCE',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    location: { lat: 9.5350, lng: -13.6800, address: 'Poste Source Dixinn' },
    description: 'Inspection préventive transformateur',
    assignedTo: { nom: 'Mamadou Sylla', email: 'mamadou.sylla@edg.gn' },
    assignedBy: 'Ibrahim Camara',
    assignedAt: new Date(Date.now() - 86400000).toISOString(),
    acceptedAt: new Date(Date.now() - 82800000).toISOString(),
    startedAt: new Date(Date.now() - 79200000).toISOString(),
    completedAt: new Date(Date.now() - 75600000).toISOString(),
    estimatedDuration: 90,
    actualDuration: 85,
    completionPhoto: '/uploads/maintenance-001.jpg',
    completionReport: 'Inspection complète effectuée. Transformateur en bon état. Niveau d\'huile optimal.',
  },
];

function TaskManagement() {
  const notify = useNotification();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // Déterminer le rôle de l'utilisateur actuel
  const currentUserRole = 'SUPERVISEUR_ZONE'; // À récupérer depuis le contexte auth
  const isSupervisor = currentUserRole === 'SUPERVISEUR_ZONE' || currentUserRole === 'ADMIN_SYSTEME';
  const isAgent = currentUserRole === 'AGENT_TERRAIN';

  // Filtrer les tâches selon le rôle
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesType = filterType === 'all' || task.type === filterType;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesSearch = searchQuery === '' || 
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Les agents voient seulement leurs tâches
    if (isAgent) {
      // Simuler : l'agent actuel est Mamadou Sylla
      const currentAgentEmail = 'mamadou.sylla@edg.gn';
      if (task.assignedTo.email !== currentAgentEmail) return false;
    }
    
    return matchesStatus && matchesType && matchesPriority && matchesSearch;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'ASSIGNED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    urgent: tasks.filter(t => t.priority === 'URGENT').length,
  };

  const handleAccept = (task) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Accepter cette tâche ?',
      message: `Vous acceptez la tâche ${task.taskNumber}. Vous pourrez la démarrer ensuite.`,
      type: 'info',
      confirmText: 'Accepter',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, status: 'ACCEPTED', acceptedAt: new Date().toISOString() }
            : t
        ));
        notify.success(`Tâche ${task.taskNumber} acceptée`, { title: '✅ Tâche acceptée' });
      },
    });
  };

  const handleStart = (task) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Démarrer cette tâche ?',
      message: `Vous démarrez la tâche ${task.taskNumber}. Le temps de traitement commence maintenant.`,
      type: 'info',
      confirmText: 'Démarrer',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, status: 'IN_PROGRESS', startedAt: new Date().toISOString() }
            : t
        ));
        notify.success(`Tâche ${task.taskNumber} démarrée`, { title: '🚀 Tâche démarrée' });
      },
    });
  };

  const handleComplete = (task) => {
    setSelectedTask(task);
    // Ouvrir le modal de complétion
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'URGENT': return { color: 'red', badge: 'badge-danger', label: 'Urgent' };
      case 'HIGH': return { color: 'amber', badge: 'badge-warning', label: 'Haute' };
      case 'MEDIUM': return { color: 'primary', badge: 'badge-info', label: 'Moyenne' };
      default: return { color: 'gray', badge: 'badge-info', label: 'Basse' };
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'ASSIGNED': return { color: 'primary', badge: 'badge-info', label: 'Assignée', icon: Send };
      case 'ACCEPTED': return { color: 'success', badge: 'badge-success', label: 'Acceptée', icon: CheckCircle };
      case 'IN_PROGRESS': return { color: 'amber', badge: 'badge-warning', label: 'En cours', icon: Loader };
      case 'COMPLETED': return { color: 'success', badge: 'badge-success', label: 'Complétée', icon: CheckCircle };
      default: return { color: 'gray', badge: 'badge-info', label: status, icon: Clock };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isAgent ? 'Mes Tâches' : 'Gestion des Tâches'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAgent 
              ? 'Suivez et gérez vos missions assignées'
              : 'Assignation et suivi des tâches des agents de terrain'
            }
          </p>
        </div>
        
        {isSupervisor && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="btn-primary"
          >
            <UserPlus className="w-5 h-5" />
            <span>Assigner une tâche</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">Assignées</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.pending}</p>
        </div>
        <div className="warning-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">En cours</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
        </div>
        <div className="success-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Complétées</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.completed}</p>
        </div>
        <div className="danger-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Urgentes</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.urgent}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            <option value="ASSIGNED">Assignée</option>
            <option value="ACCEPTED">Acceptée</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Complétée</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les types</option>
            <option value="INCIDENT">Incident</option>
            <option value="AUDIT">Audit</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INSPECTION">Inspection</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Toutes priorités</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">Haute</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="LOW">Basse</option>
          </select>
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="card text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Aucune tâche correspondante
            </h3>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityConfig = getPriorityConfig(task.priority);
            const statusConfig = getStatusConfig(task.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={task.id}
                className={`card border-l-4 border-${priorityConfig.color}-500 hover:shadow-lg transition-all`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      priorityConfig.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                      priorityConfig.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-primary-100 dark:bg-primary-900/30'
                    }`}>
                      <StatusIcon className={`w-6 h-6 text-${priorityConfig.color}-600`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-primary-600 dark:text-primary-400">
                          {task.taskNumber}
                        </span>
                        <span className={priorityConfig.badge}>{priorityConfig.label}</span>
                        <span className={statusConfig.badge}>{statusConfig.label}</span>
                        <span className="badge-info">{task.type}</span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {task.description}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {task.location && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{task.location.address}</span>
                          </span>
                        )}
                        {task.assignedTo && (
                          <span className="flex items-center space-x-1">
                            <UserCheck className="w-4 h-4" />
                            <span>{task.assignedTo.nom}</span>
                          </span>
                        )}
                        {task.estimatedDuration && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>~{task.estimatedDuration} min</span>
                          </span>
                        )}
                      </div>

                      {/* Timeline */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                        {task.assignedAt && (
                          <span className="text-gray-500">
                            Assignée: {new Date(task.assignedAt).toLocaleString('fr-FR')}
                          </span>
                        )}
                        {task.acceptedAt && (
                          <span className="text-success-600">
                            Acceptée: {new Date(task.acceptedAt).toLocaleString('fr-FR')}
                          </span>
                        )}
                        {task.startedAt && (
                          <span className="text-amber-600">
                            Démarrée: {new Date(task.startedAt).toLocaleString('fr-FR')}
                          </span>
                        )}
                        {task.completedAt && (
                          <span className="text-success-600">
                            Complétée: {new Date(task.completedAt).toLocaleString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions selon le rôle */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                    {isAgent && task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleAccept(task)}
                        className="btn-success text-sm px-3 py-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accepter</span>
                      </button>
                    )}
                    {isAgent && task.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleStart(task)}
                        className="btn-primary text-sm px-3 py-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Démarrer</span>
                      </button>
                    )}
                    {isAgent && task.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleComplete(task)}
                        className="btn-success text-sm px-3 py-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Compléter</span>
                      </button>
                    )}
                    {task.location && (
                      <button
                        onClick={() => {}}
                        className="btn-secondary text-sm px-3 py-2"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>GPS</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTask(task)}
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

      {/* Modal détails tâche */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={handleComplete}
          isAgent={isAgent}
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

// Modal détails tâche
function TaskDetailModal({ task, onClose, onComplete, isAgent }) {
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionReport, setCompletionReport] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const notify = useNotification();

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    setLoading(false);
    setShowCompleteForm(false);
    notify.success(`Tâche ${task.taskNumber} complétée avec succès`, { title: '✅ Tâche complétée' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 bg-gradient-to-r from-primary-500 to-primary-600`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 font-mono">{task.taskNumber}</p>
              <h3 className="text-xl font-bold text-white mt-1">{task.description}</h3>
            </div>
            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-white/20 text-white">
              {task.status}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Infos principales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{task.type}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Priorité</p>
              <span className={`badge ${
                task.priority === 'URGENT' ? 'badge-danger' :
                task.priority === 'HIGH' ? 'badge-warning' : 'badge-info'
              }`}>
                {task.priority}
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Assignée à</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {task.assignedTo?.nom || 'Non assignée'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Durée estimée</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {task.estimatedDuration ? `${task.estimatedDuration} min` : 'Non définie'}
              </p>
            </div>
          </div>

          {/* Localisation */}
          {task.location && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <h4 className="font-semibold text-primary-800 dark:text-primary-200 mb-2 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Localisation</span>
              </h4>
              <p className="text-primary-700 dark:text-primary-300">{task.location.address}</p>
              <p className="text-xs text-primary-500 mt-1">
                GPS: {task.location.lat.toFixed(4)}, {task.location.lng.toFixed(4)}
              </p>
              <button className="mt-3 btn-primary text-sm px-3 py-2">
                <Navigation className="w-4 h-4" />
                <span>Ouvrir dans Maps</span>
              </button>
            </div>
          )}

          {/* Rapport de complétion */}
          {task.completionReport && (
            <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
              <h4 className="font-semibold text-success-800 dark:text-success-200 mb-2 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Rapport de complétion</span>
              </h4>
              <p className="text-success-700 dark:text-success-300">{task.completionReport}</p>
              {task.completionPhoto && (
                <img src={task.completionPhoto} alt="Photo complétion" className="mt-3 rounded-lg max-w-full" />
              )}
              {task.actualDuration && (
                <p className="text-xs text-success-500 mt-2">
                  Durée réelle: {task.actualDuration} minutes
                </p>
              )}
            </div>
          )}

          {/* Formulaire de complétion */}
          {isAgent && task.status === 'IN_PROGRESS' && !showCompleteForm && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <h4 className="font-semibold text-amber-800 dark:amber-200 mb-2">
                Compléter la tâche
              </h4>
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                Rédigez un rapport et ajoutez une photo si nécessaire.
              </p>
              <button
                onClick={() => setShowCompleteForm(true)}
                className="btn-success text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Remplir le formulaire</span>
              </button>
            </div>
          )}

          {showCompleteForm && (
            <form onSubmit={handleCompleteSubmit} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rapport de complétion *
                </label>
                <textarea
                  required
                  value={completionReport}
                  onChange={(e) => setCompletionReport(e.target.value)}
                  rows={4}
                  className="input resize-none"
                  placeholder="Décrivez les travaux effectués, les résultats, les observations..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Photo (optionnel)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCompletionPhoto(e.target.files[0])}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteForm(false)}
                  className="btn-secondary text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-success text-sm"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Envoi...' : 'Compléter'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskManagement;
