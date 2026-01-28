import { useState } from 'react';
import { FileText, Search, Download, Filter, TrendingUp, DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Données simulées
const MOCK_INVOICES = [
  { id: 'FAC-2024-001', client: 'Mamadou Diallo', montant: 125000, periode: 'Jan 2024', statut: 'PAYEE', datePaiement: '2024-01-15' },
  { id: 'FAC-2024-002', client: 'Fatoumata Bah', montant: 85000, periode: 'Jan 2024', statut: 'PAYEE', datePaiement: '2024-01-18' },
  { id: 'FAC-2024-003', client: 'Ibrahima Sow', montant: 220000, periode: 'Jan 2024', statut: 'IMPAYEE', dateEcheance: '2024-02-15' },
  { id: 'FAC-2024-004', client: 'Aissatou Barry', montant: 95000, periode: 'Jan 2024', statut: 'EN_ATTENTE', dateEcheance: '2024-02-20' },
  { id: 'FAC-2024-005', client: 'Oumar Camara', montant: 180000, periode: 'Jan 2024', statut: 'PAYEE', datePaiement: '2024-01-22' },
];

function BillingModule() {
  const [invoices] = useState(MOCK_INVOICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         inv.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || inv.statut === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalFacture: invoices.reduce((sum, i) => sum + i.montant, 0),
    totalPaye: invoices.filter(i => i.statut === 'PAYEE').reduce((sum, i) => sum + i.montant, 0),
    totalImpaye: invoices.filter(i => i.statut === 'IMPAYEE').reduce((sum, i) => sum + i.montant, 0),
    enAttente: invoices.filter(i => i.statut === 'EN_ATTENTE').length,
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'PAYEE':
        return { badge: 'badge-success', icon: CheckCircle, label: 'Payée' };
      case 'IMPAYEE':
        return { badge: 'badge-danger', icon: AlertCircle, label: 'Impayée' };
      case 'EN_ATTENTE':
        return { badge: 'badge-warning', icon: Clock, label: 'En attente' };
      default:
        return { badge: 'badge-info', icon: FileText, label: status };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Facturation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des factures et paiements
          </p>
        </div>
        <button className="btn-primary">
          <FileText className="w-5 h-5" />
          <span>Générer factures</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total facturé</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {(stats.totalFacture / 1000).toFixed(0)}K GNF
              </p>
            </div>
            <FileText className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <div className="success-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total payé</p>
              <p className="text-xl font-bold text-success-600 dark:text-success-400">
                {(stats.totalPaye / 1000).toFixed(0)}K GNF
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-success-500" />
          </div>
        </div>

        <div className="danger-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Impayés</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {(stats.totalImpaye / 1000).toFixed(0)}K GNF
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="warning-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.enAttente}
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Tous les statuts</option>
              <option value="PAYEE">Payées</option>
              <option value="IMPAYEE">Impayées</option>
              <option value="EN_ATTENTE">En attente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des factures */}
      <div className="card overflow-hidden p-0">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Période</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const statusConfig = getStatusConfig(invoice.statut);
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={invoice.id}>
                    <td>
                      <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">
                        {invoice.id}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {invoice.client}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{invoice.periode}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {invoice.montant.toLocaleString()} GNF
                      </span>
                    </td>
                    <td>
                      <span className={statusConfig.badge}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BillingModule;
