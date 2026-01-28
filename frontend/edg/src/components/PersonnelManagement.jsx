import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, MapPin, Clock, CheckCircle, XCircle,
  AlertTriangle, Search, Filter, Eye, Edit, Trash2, Navigation,
  Phone, Mail, Building, Activity, TrendingUp, Award, Target,
  Calendar, FileText, Camera, Send, UserCheck, UserX, Map
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';
import { personnelService } from '@common/services';

// Données simulées des employés (sera remplacé par l'API)
const MOCK_EMPLOYEES = [
  {
    id: 'EMP-001',
    nom: 'Ibrahim Camara',
    email: 'ibrahim@edg.gn',
    telephone: '+224 622 00 00 01',
    edgSubrole: 'SUPERVISEUR_ZONE',
    zoneAssigned: 'Dixinn',
    status: 'ACTIVE',
    supervisor: null,
    location: { lat: 9.5350, lng: -13.6800, updatedAt: new Date().toISOString() },
    stats: { activeTasks: 3, completedTasksMonth: 45 },
  },
  {
    id: 'EMP-002',
    nom: 'Mamadou Sylla',
    email: 'mamadou.sylla@edg.gn',
    telephone: '+224 622 00 00 02',
    edgSubrole: 'AGENT_TERRAIN',
    zoneAssigned: 'Dixinn',
    status: 'ACTIVE',
    supervisor: { id: 'EMP-001', nom: 'Ibrahim Camara' },
    location: { lat: 9.5380, lng: -13.6750, updatedAt: new Date(Date.now() - 300000).toISOString() },
    stats: { activeTasks: 2, completedTasksMonth: 38 },
  },
  {
    id: 'EMP-003',
    nom: 'Amadou Diallo',
    email: 'amadou.diallo@edg.gn',
    telephone: '+224 622 00 00 03',
    edgSubrole: 'AGENT_TERRAIN',
    zoneAssigned: 'Ratoma',
    status: 'ACTIVE',
    supervisor: { id: 'EMP-001', nom: 'Ibrahim Camara' },
    location: { lat: 9.5850, lng: -13.6150, updatedAt: new Date(Date.now() - 600000).toISOString() },
    stats: { activeTasks: 1, completedTasksMonth: 42 },
  },
  {
    id: 'EMP-004',
    nom: 'Fatoumata Bah',
    email: 'fatoumata.bah@edg.gn',
    telephone: '+224 622 00 00 04',
    edgSubrole: 'ADMIN_SYSTEME',
    zoneAssigned: null,
    status: 'ACTIVE',
    supervisor: null,
    location: null,
    stats: { activeTasks: 0, completedTasksMonth: 0 },
  },
];

function PersonnelManagement() {
  const notify = useNotification();
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' ou 'pending'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // Déterminer le rôle de l'utilisateur actuel (simulé)
  const currentUserRole = 'ADMIN_SYSTEME'; // À récupérer depuis le contexte auth
  const canCreate = currentUserRole === 'ADMIN_SYSTEME';
  const canViewAll = currentUserRole === 'ADMIN_SYSTEME' || currentUserRole === 'SUPERVISEUR_ZONE';
  const isAdminSysteme = currentUserRole === 'ADMIN_SYSTEME';

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les employés actifs
        const employeesData = await personnelService.getEmployees();
        setEmployees(employeesData.employees || []);
        
        // Charger les comptes en attente (si admin)
        if (isAdminSysteme) {
          const pendingData = await personnelService.getPendingUsers();
          setPendingUsers(pendingData.pendingUsers || []);
        }
      } catch (error) {
        console.error('Erreur chargement données:', error);
        notify.error('Erreur lors du chargement des données', { title: '❌ Erreur' });
      }
    };
    
    loadData();
  }, [isAdminSysteme]);

  const filteredEmployees = employees.filter(emp => {
    const matchesRole = filterRole === 'all' || emp.edgSubrole === filterRole;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      emp.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.zoneAssigned && emp.zoneAssigned.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesStatus && matchesSearch;
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'ACTIVE').length,
    supervisors: employees.filter(e => e.edgSubrole === 'SUPERVISEUR_ZONE').length,
    agents: employees.filter(e => e.edgSubrole === 'AGENT_TERRAIN').length,
    admins: employees.filter(e => e.edgSubrole === 'ADMIN_SYSTEME').length,
  };

  const getSubroleConfig = (subrole) => {
    switch (subrole) {
      case 'ADMIN_SYSTEME':
        return { label: 'Admin Système', color: 'purple', icon: Shield, badge: 'badge-purple' };
      case 'SUPERVISEUR_ZONE':
        return { label: 'Superviseur', color: 'primary', icon: Users, badge: 'badge-primary' };
      case 'AGENT_TERRAIN':
        return { label: 'Agent Terrain', color: 'success', icon: UserCheck, badge: 'badge-success' };
      default:
        return { label: subrole, color: 'gray', icon: Users, badge: 'badge-info' };
    }
  };

  const handleDelete = (employee) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Révoquer l\'accès ?',
      message: `Voulez-vous vraiment révoquer l'accès de ${employee.nom} ? Cette action peut être annulée.`,
      type: 'warning',
      confirmText: 'Révoquer',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        setEmployees(prev => prev.filter(e => e.id !== employee.id));
        notify.success(`Accès révoqué pour ${employee.nom}`, { title: '🔒 Accès révoqué' });
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gestion du Personnel
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administration des employés EDG et contrôle d'accès
          </p>
        </div>
        
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nouvel employé</span>
          </button>
        )}
      </div>

      {/* Onglets */}
      {isAdminSysteme && (
        <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'active'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Employés actifs ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-semibold transition-colors relative ${
              activeTab === 'pending'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            En attente de validation ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="success-card">
          <p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.active}</p>
        </div>
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">Superviseurs</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.supervisors}</p>
        </div>
        <div className="card bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">Agents</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.agents}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.admins}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les rôles</option>
            <option value="ADMIN_SYSTEME">Admin Système</option>
            <option value="SUPERVISEUR_ZONE">Superviseur</option>
            <option value="AGENT_TERRAIN">Agent Terrain</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="INACTIVE">Inactif</option>
          </select>
        </div>
      </div>

      {/* Liste des comptes en attente */}
      {activeTab === 'pending' && isAdminSysteme && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Aucun compte en attente
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Tous les comptes ont été validés
              </p>
            </div>
          ) : (
            pendingUsers.map((user) => (
              <div
                key={user.id}
                className="card border-l-4 border-amber-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock className="w-7 h-7 text-amber-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">{user.nom}</h4>
                        <span className="badge-warning">En attente</span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                        {user.telephone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4" />
                            <span>{user.telephone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedEmployee(user);
                      setShowValidateModal(true);
                    }}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Valider</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Liste des employés actifs */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees.map((employee) => {
            const roleConfig = getSubroleConfig(employee.edgSubrole);
            const RoleIcon = roleConfig.icon;

            return (
            <div
              key={employee.id}
              className="card hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedEmployee(employee)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    roleConfig.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    roleConfig.color === 'primary' ? 'bg-primary-100 dark:bg-primary-900/30' :
                    'bg-success-100 dark:bg-success-900/30'
                  }`}>
                    <RoleIcon className={`w-7 h-7 ${
                      roleConfig.color === 'purple' ? 'text-purple-600' :
                      roleConfig.color === 'primary' ? 'text-primary-600' :
                      'text-success-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">{employee.nom}</h4>
                      <span className={roleConfig.badge}>{roleConfig.label}</span>
                      {employee.status === 'ACTIVE' ? (
                        <span className="badge-success">Actif</span>
                      ) : (
                        <span className="badge-danger">Inactif</span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      {employee.telephone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>{employee.telephone}</span>
                        </div>
                      )}
                      {employee.zoneAssigned && (
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4" />
                          <span>{employee.zoneAssigned}</span>
                        </div>
                      )}
                      {employee.supervisor && (
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Supervisé par: {employee.supervisor.nom}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3 text-xs">
                      <div className="flex items-center space-x-1">
                        <Target className="w-3 h-3 text-primary-500" />
                        <span>{employee.stats.activeTasks} tâches actives</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-success-500" />
                        <span>{employee.stats.completedTasksMonth} complétées (30j)</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {employee.location && (
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Voir sur la carte"
                    >
                      <MapPin className="w-4 h-4 text-primary-500" />
                    </button>
                  )}
                  {canCreate && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setShowEditModal(true); }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Révoquer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal détails employé */}
      {selectedEmployee && !showEditModal && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onEdit={() => { setShowEditModal(true); }}
          canEdit={canCreate}
        />
      )}

      {/* Modal création */}
      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newEmployee) => {
            setEmployees(prev => [newEmployee, ...prev]);
            setShowCreateModal(false);
            notify.success(`Employé ${newEmployee.nom} créé avec succès`, { title: '✅ Création réussie' });
          }}
        />
      )}

      {/* Modal édition */}
      {showEditModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }}
          onSuccess={(updated) => {
            setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
            setShowEditModal(false);
            setSelectedEmployee(null);
            notify.success(`Employé ${updated.nom} mis à jour`, { title: '✅ Mise à jour réussie' });
          }}
        />
      )}

      {/* Modal validation */}
      {showValidateModal && selectedEmployee && (
        <ValidateUserModal
          user={selectedEmployee}
          onClose={() => { setShowValidateModal(false); setSelectedEmployee(null); }}
          onSuccess={(validated) => {
            // Retirer de la liste des en attente
            setPendingUsers(prev => prev.filter(u => u.id !== validated.id));
            // Ajouter à la liste des employés actifs
            setEmployees(prev => [validated, ...prev]);
            setShowValidateModal(false);
            setSelectedEmployee(null);
            setActiveTab('active');
            notify.success(`Compte ${validated.nom} validé avec succès`, { title: '✅ Validation réussie' });
          }}
        />
      )}

      {/* Modal validation compte en attente */}
      {showValidateModal && selectedEmployee && (
        <ValidateUserModal
          user={selectedEmployee}
          onClose={() => { setShowValidateModal(false); setSelectedEmployee(null); }}
          onSuccess={(validated) => {
            setPendingUsers(prev => prev.filter(u => u.id !== validated.id));
            setEmployees(prev => [validated, ...prev]);
            setShowValidateModal(false);
            setSelectedEmployee(null);
            notify.success(`Compte ${validated.nom} validé avec succès`, { title: '✅ Validation réussie' });
          }}
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

// Modal de détails employé
function EmployeeDetailModal({ employee, onClose, onEdit, canEdit }) {
  const roleConfig = {
    'ADMIN_SYSTEME': { label: 'Admin Système', color: 'purple', icon: Shield },
    'SUPERVISEUR_ZONE': { label: 'Superviseur Zone', color: 'primary', icon: Users },
    'AGENT_TERRAIN': { label: 'Agent Terrain', color: 'success', icon: UserCheck },
  }[employee.edgSubrole] || { label: employee.edgSubrole, color: 'gray', icon: Users };
  const RoleIcon = roleConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 bg-gradient-to-r from-${roleConfig.color}-500 to-${roleConfig.color}-600`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <RoleIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{employee.nom}</h3>
                <p className="text-white/80">{employee.email}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-white/20 text-white">
              {roleConfig.label}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Informations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Téléphone</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{employee.telephone || 'Non renseigné'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Zone assignée</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{employee.zoneAssigned || 'Toutes zones'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Statut</p>
              <span className={`badge ${employee.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                {employee.status}
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Superviseur</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {employee.supervisor?.nom || 'Aucun'}
              </p>
            </div>
          </div>

          {/* Localisation */}
          {employee.location && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-primary-800 dark:text-primary-200 mb-1 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Position actuelle</span>
                  </h4>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    {employee.location.lat.toFixed(4)}, {employee.location.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-primary-500 mt-1">
                    Mise à jour: {new Date(employee.location.updatedAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <button className="btn-primary text-sm px-3 py-2">
                  <Navigation className="w-4 h-4" />
                  <span>Ouvrir Maps</span>
                </button>
              </div>
            </div>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <Target className="w-6 h-6 text-primary-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{employee.stats.activeTasks}</p>
              <p className="text-xs text-gray-500">Tâches actives</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <CheckCircle className="w-6 h-6 text-success-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{employee.stats.completedTasksMonth}</p>
              <p className="text-xs text-gray-500">Complétées (30j)</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <Award className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">4.8</p>
              <p className="text-xs text-gray-500">Note moyenne</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Fermer</button>
          {canEdit && (
            <button onClick={onEdit} className="btn-primary">
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal création employé
function CreateEmployeeModal({ onClose, onSuccess }) {
  const notify = useNotification();
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    telephone: '',
    edgSubrole: 'AGENT_TERRAIN',
    zoneAssigned: '',
    supervisorId: null,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simuler l'appel API
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newEmployee = {
      id: `EMP-${Date.now()}`,
      ...formData,
      status: 'ACTIVE',
      supervisor: null,
      location: null,
      stats: { activeTasks: 0, completedTasksMonth: 0 },
    };

    setLoading(false);
    onSuccess(newEmployee);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Créer un nouvel employé</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom complet *
            </label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="input"
              placeholder="Jean Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="agent@edg.gn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mot de passe *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className="input"
              placeholder="+224 622 00 00 00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rôle *
            </label>
            <select
              required
              value={formData.edgSubrole}
              onChange={(e) => setFormData({ ...formData, edgSubrole: e.target.value })}
              className="input"
            >
              <option value="AGENT_TERRAIN">Agent Terrain</option>
              <option value="SUPERVISEUR_ZONE">Superviseur Zone</option>
              <option value="ADMIN_SYSTEME">Admin Système</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zone assignée
            </label>
            <select
              value={formData.zoneAssigned}
              onChange={(e) => setFormData({ ...formData, zoneAssigned: e.target.value })}
              className="input"
            >
              <option value="">Toutes zones</option>
              <option value="Dixinn">Dixinn</option>
              <option value="Kaloum">Kaloum</option>
              <option value="Ratoma">Ratoma</option>
              <option value="Matoto">Matoto</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{loading ? 'Création...' : 'Créer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal validation compte en attente
function ValidateUserModal({ user, onClose, onSuccess }) {
  const notify = useNotification();
  const [formData, setFormData] = useState({
    edgSubrole: 'AGENT_TERRAIN',
    zoneAssigned: '',
    supervisorId: null,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await personnelService.validateUser(user.id, {
        edgSubrole: formData.edgSubrole,
        zoneAssigned: formData.zoneAssigned || null,
        supervisorId: formData.supervisorId || null,
      });

      const validated = {
        id: user.id,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        edgSubrole: formData.edgSubrole,
        zoneAssigned: formData.zoneAssigned || null,
        status: 'ACTIVE',
        supervisor: null,
        location: null,
        stats: { activeTasks: 0, completedTasksMonth: 0 },
      };

      setLoading(false);
      onSuccess(validated);
      notify.success(`Compte ${user.nom} validé avec succès`, { title: '✅ Validation réussie' });
    } catch (error) {
      setLoading(false);
      notify.error(error.response?.data?.error || 'Erreur lors de la validation', { title: '❌ Erreur' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Valider le compte</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {user.nom} ({user.email})
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigner le rôle *
            </label>
            <select
              required
              value={formData.edgSubrole}
              onChange={(e) => setFormData({ ...formData, edgSubrole: e.target.value })}
              className="input"
            >
              <option value="AGENT_TERRAIN">Agent Terrain</option>
              <option value="SUPERVISEUR_ZONE">Superviseur Zone</option>
              <option value="ADMIN_SYSTEME">Admin Système</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Ce rôle détermine les permissions de l'utilisateur dans le système
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zone assignée
            </label>
            <select
              value={formData.zoneAssigned}
              onChange={(e) => setFormData({ ...formData, zoneAssigned: e.target.value })}
              className="input"
            >
              <option value="">Toutes zones</option>
              <option value="Dixinn">Dixinn</option>
              <option value="Kaloum">Kaloum</option>
              <option value="Ratoma">Ratoma</option>
              <option value="Matoto">Matoto</option>
            </select>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>⚠️ Attention :</strong> Une fois validé, l'utilisateur pourra se connecter immédiatement avec les permissions du rôle assigné.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>{loading ? 'Validation...' : 'Valider le compte'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal édition employé
function EditEmployeeModal({ employee, onClose, onSuccess }) {
  const notify = useNotification();
  const [formData, setFormData] = useState({
    nom: employee.nom,
    email: employee.email,
    telephone: employee.telephone || '',
    edgSubrole: employee.edgSubrole,
    zoneAssigned: employee.zoneAssigned || '',
    status: employee.status,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const updated = { ...employee, ...formData };
    setLoading(false);
    onSuccess(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Modifier l'employé</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom complet *
            </label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rôle *
            </label>
            <select
              required
              value={formData.edgSubrole}
              onChange={(e) => setFormData({ ...formData, edgSubrole: e.target.value })}
              className="input"
            >
              <option value="AGENT_TERRAIN">Agent Terrain</option>
              <option value="SUPERVISEUR_ZONE">Superviseur Zone</option>
              <option value="ADMIN_SYSTEME">Admin Système</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zone assignée
            </label>
            <select
              value={formData.zoneAssigned}
              onChange={(e) => setFormData({ ...formData, zoneAssigned: e.target.value })}
              className="input"
            >
              <option value="">Toutes zones</option>
              <option value="Dixinn">Dixinn</option>
              <option value="Kaloum">Kaloum</option>
              <option value="Ratoma">Ratoma</option>
              <option value="Matoto">Matoto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Statut *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
            >
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="INACTIVE">Inactif</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>{loading ? 'Mise à jour...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PersonnelManagement;
