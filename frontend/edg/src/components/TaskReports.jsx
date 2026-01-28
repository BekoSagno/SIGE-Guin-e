import { useState, useEffect } from 'react';
import {
  FileBarChart, Plus, Download, Eye, Calendar, Filter, Search,
  CheckCircle, Clock, AlertTriangle, TrendingUp, BarChart3,
  FileText, Users, Zap, Loader, X, ChevronDown, ChevronUp, FileSpreadsheet
} from 'lucide-react';
import { taskReportsService } from '@common/services';
import { useNotification } from './Notification';
import { exportReportToPDF, exportReportToExcel, exportMultipleReportsToExcel } from '../utils/exportUtils';

function TaskReports() {
  const notify = useNotification();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filtres
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Formulaire de génération
  const [formData, setFormData] = useState({
    reportType: 'DAILY',
    periodStart: '',
    periodEnd: '',
    taskType: 'ALL',
    statusFilter: 'ALL',
    priorityFilter: 'ALL',
    assignedToFilter: '',
    zoneFilter: '',
  });

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await taskReportsService.getReports({ limit: 100 });
      setReports(response.reports || []);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
      notify.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await taskReportsService.getStats();
      setStats(response);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const response = await taskReportsService.generateReport(formData);
      notify.success(`Rapport ${response.report.reportNumber} généré avec succès`);
      setShowGenerateModal(false);
      setFormData({
        reportType: 'DAILY',
        periodStart: '',
        periodEnd: '',
        taskType: 'ALL',
        statusFilter: 'ALL',
        priorityFilter: 'ALL',
        assignedToFilter: '',
        zoneFilter: '',
      });
      loadReports();
      loadStats();
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      notify.error(error.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const report = await taskReportsService.getReport(reportId);
      setSelectedReport(report);
    } catch (error) {
      console.error('Erreur chargement rapport:', error);
      notify.error('Erreur lors du chargement du rapport');
    }
  };

  const handleExportPDF = async (reportId) => {
    try {
      const report = await taskReportsService.getReport(reportId);
      exportReportToPDF(report);
      notify.success('Rapport PDF généré avec succès');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      notify.error('Erreur lors de l\'export PDF');
    }
  };

  const handleExportExcel = async (reportId) => {
    try {
      const report = await taskReportsService.getReport(reportId);
      exportReportToExcel(report);
      notify.success('Rapport Excel généré avec succès');
    } catch (error) {
      console.error('Erreur export Excel:', error);
      notify.error('Erreur lors de l\'export Excel');
    }
  };

  const handleExportMultipleExcel = () => {
    if (filteredReports.length === 0) {
      notify.error('Aucun rapport à exporter');
      return;
    }
    try {
      exportMultipleReportsToExcel(filteredReports);
      notify.success(`${filteredReports.length} rapports exportés en Excel`);
    } catch (error) {
      console.error('Erreur export multiple:', error);
      notify.error('Erreur lors de l\'export');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesType = filterType === 'all' || r.report_type === filterType;
    const matchesSearch = searchQuery === '' ||
      r.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.generated_by_nom && r.generated_by_nom.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getReportTypeLabel = (type) => {
    const labels = {
      'DAILY': 'Quotidien',
      'WEEKLY': 'Hebdomadaire',
      'MONTHLY': 'Mensuel',
      'CUSTOM': 'Personnalisé',
      'TASK_COMPLETION': 'Complétion Tâches',
    };
    return labels[type] || type;
  };

  const getReportTypeColor = (type) => {
    const colors = {
      'DAILY': 'primary',
      'WEEKLY': 'success',
      'MONTHLY': 'warning',
      'CUSTOM': 'accent',
      'TASK_COMPLETION': 'info',
    };
    return colors[type] || 'primary';
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Rapports de Tâches
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Génération et consultation des rapports d'activité des agents
          </p>
        </div>
        <div className="flex gap-2">
          {filteredReports.length > 0 && (
            <button
              onClick={handleExportMultipleExcel}
              className="btn-secondary"
              title="Exporter tous les rapports filtrés en Excel"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="hidden sm:inline">Exporter tout</span>
            </button>
          )}
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            <span>Générer un rapport</span>
          </button>
        </div>
      </div>

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Rapports</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.overview?.total_reports || 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400">Tâches Rapportées</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.overview?.total_tasks_reported || 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400">Temps Moyen</p>
            <p className="text-2xl font-bold text-success-600 dark:text-success-400">
              {stats.overview?.avg_completion_time_all 
                ? `${Math.round(stats.overview.avg_completion_time_all)} min`
                : 'N/A'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400">Dernier Rapport</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {stats.overview?.last_generated
                ? new Date(stats.overview.last_generated).toLocaleDateString('fr-FR')
                : 'Jamais'}
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rapport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les types</option>
            <option value="DAILY">Quotidien</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="MONTHLY">Mensuel</option>
            <option value="CUSTOM">Personnalisé</option>
            <option value="TASK_COMPLETION">Complétion</option>
          </select>
        </div>
      </div>

      {/* Liste des rapports */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="card text-center py-12">
            <FileBarChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Aucun rapport trouvé
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Générez votre premier rapport pour commencer
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const typeColor = getReportTypeColor(report.report_type);
            return (
              <div
                key={report.id}
                className="card border-l-4 border-primary-500 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${typeColor}-100 dark:bg-${typeColor}-900/30`}>
                      <FileBarChart className={`w-6 h-6 text-${typeColor}-600`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-primary-600 dark:text-primary-400">
                          {report.report_number}
                        </span>
                        <span className={`badge badge-${typeColor}`}>
                          {getReportTypeLabel(report.report_type)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Total Tâches</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {report.total_tasks}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Complétées</p>
                          <p className="font-semibold text-success-600 dark:text-success-400">
                            {report.completed_tasks}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">En cours</p>
                          <p className="font-semibold text-amber-600 dark:text-amber-400">
                            {report.in_progress_tasks}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Temps moyen</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {report.avg_completion_time
                              ? `${Math.round(report.avg_completion_time)} min`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {report.period_start && report.period_end
                              ? `${new Date(report.period_start).toLocaleDateString('fr-FR')} - ${new Date(report.period_end).toLocaleDateString('fr-FR')}`
                              : 'Période non définie'}
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{report.generated_by_nom || 'Inconnu'}</span>
                        </span>
                        <span>
                          {new Date(report.generated_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                    <button
                      onClick={() => handleViewReport(report.id)}
                      className="btn-secondary text-sm px-3 py-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Voir</span>
                    </button>
                    <div className="relative group">
                      <button
                        className="btn-primary text-sm px-3 py-2"
                        onMouseEnter={(e) => {
                          e.currentTarget.parentElement.querySelector('.export-menu').classList.remove('opacity-0', 'invisible');
                          e.currentTarget.parentElement.querySelector('.export-menu').classList.add('opacity-100', 'visible');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.parentElement.querySelector('.export-menu').classList.add('opacity-0', 'invisible');
                          e.currentTarget.parentElement.querySelector('.export-menu').classList.remove('opacity-100', 'visible');
                        }}
                      >
                        <Download className="w-4 h-4" />
                        <span>Exporter</span>
                      </button>
                      <div className="export-menu absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible transition-all z-10"
                        onMouseEnter={(e) => {
                          e.classList.remove('opacity-0', 'invisible');
                          e.classList.add('opacity-100', 'visible');
                        }}
                        onMouseLeave={(e) => {
                          e.classList.add('opacity-0', 'invisible');
                          e.classList.remove('opacity-100', 'visible');
                        }}
                      >
                        <button
                          onClick={() => handleExportPDF(report.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-t-lg"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Exporter en PDF</span>
                        </button>
                        <button
                          onClick={() => handleExportExcel(report.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-b-lg"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Exporter en Excel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal génération */}
      {showGenerateModal && (
        <GenerateReportModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleGenerate}
          onClose={() => setShowGenerateModal(false)}
          generating={generating}
        />
      )}

      {/* Modal détails rapport */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

// Modal de génération
function GenerateReportModal({ formData, setFormData, onSubmit, onClose, generating }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Générer un Rapport</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de rapport *
            </label>
            <select
              required
              value={formData.reportType}
              onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
              className="input"
            >
              <option value="DAILY">Quotidien</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuel</option>
              <option value="CUSTOM">Personnalisé</option>
              <option value="TASK_COMPLETION">Complétion Tâches</option>
            </select>
          </div>

          {(formData.reportType === 'CUSTOM' || formData.reportType === 'TASK_COMPLETION') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={formData.periodStart}
                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={formData.periodEnd}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de tâche
              </label>
              <select
                value={formData.taskType}
                onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                className="input"
              >
                <option value="ALL">Tous</option>
                <option value="INCIDENT">Incident</option>
                <option value="AUDIT">Audit</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INSPECTION">Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={formData.statusFilter}
                onChange={(e) => setFormData({ ...formData, statusFilter: e.target.value })}
                className="input"
              >
                <option value="ALL">Tous</option>
                <option value="COMPLETED">Complétées</option>
                <option value="IN_PROGRESS">En cours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priorité
            </label>
            <select
              value={formData.priorityFilter}
              onChange={(e) => setFormData({ ...formData, priorityFilter: e.target.value })}
              className="input"
            >
              <option value="ALL">Toutes</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">Haute</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Basse</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={generating}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={generating}
              className="btn-primary"
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <FileBarChart className="w-4 h-4" />
                  <span>Générer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal détails rapport
function ReportDetailModal({ report, onClose }) {
  const notify = useNotification();
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    tasks: false,
    byAgent: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 font-mono">{report.reportNumber}</p>
              <h3 className="text-xl font-bold text-white mt-1">
                Rapport {report.reportType}
              </h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {report.stats.total}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">Complétées</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {report.stats.completed}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">En cours</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {report.stats.inProgress}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500">Temps moyen</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {report.stats.avgCompletionTime
                  ? `${Math.round(report.stats.avgCompletionTime)} min`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Répartition par type */}
          {report.data?.stats && (
            <div className="card">
              <h4 className="font-semibold mb-4">Répartition par type</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Incidents</p>
                  <p className="text-xl font-bold text-red-600">{report.stats.incidents}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Audits</p>
                  <p className="text-xl font-bold text-amber-600">{report.stats.audits}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Maintenance</p>
                  <p className="text-xl font-bold text-primary-600">{report.stats.maintenance}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Inspections</p>
                  <p className="text-xl font-bold text-success-600">{report.stats.inspections}</p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des tâches */}
          {report.data?.tasks && report.data.tasks.length > 0 && (
            <div className="card">
              <button
                onClick={() => toggleSection('tasks')}
                className="w-full flex items-center justify-between mb-4"
              >
                <h4 className="font-semibold">Tâches ({report.data.tasks.length})</h4>
                {expandedSections.tasks ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              {expandedSections.tasks && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {report.data.tasks.slice(0, 20).map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-primary-500"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-mono text-sm text-primary-600">{task.taskNumber}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`badge badge-${task.priority === 'URGENT' ? 'danger' : 'info'}`}>
                              {task.priority}
                            </span>
                            <span className={`badge badge-${task.status === 'COMPLETED' ? 'success' : 'warning'}`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                        {task.assignedTo && (
                          <p className="text-xs text-gray-500 ml-4">
                            {task.assignedTo.nom}
                          </p>
                        )}
                      </div>
                      {task.completionReport && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {task.completionReport.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Informations */}
          <div className="card">
            <h4 className="font-semibold mb-4">Informations</h4>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Période:</strong>{' '}
                {new Date(report.periodStart).toLocaleDateString('fr-FR')} -{' '}
                {new Date(report.periodEnd).toLocaleDateString('fr-FR')}
              </p>
              <p>
                <strong>Généré par:</strong> {report.generatedBy.nom}
              </p>
              <p>
                <strong>Généré le:</strong>{' '}
                {new Date(report.generatedAt).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          <div className="relative group">
            <button className="btn-primary">
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => {
                  try {
                    exportReportToPDF(report);
                    notify.success('Rapport PDF généré avec succès');
                  } catch (error) {
                    console.error('Erreur export PDF:', error);
                    notify.error('Erreur lors de l\'export PDF');
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Exporter en PDF</span>
              </button>
              <button
                onClick={() => {
                  try {
                    exportReportToExcel(report);
                    notify.success('Rapport Excel généré avec succès');
                  } catch (error) {
                    console.error('Erreur export Excel:', error);
                    notify.error('Erreur lors de l\'export Excel');
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exporter en Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskReports;
