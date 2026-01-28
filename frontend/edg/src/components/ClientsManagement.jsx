import { useState, useEffect } from 'react';
import { Users, Search, Filter, MapPin, Zap, Phone, Mail, Eye, MoreVertical, QrCode, Copy, Check, Crown, User } from 'lucide-react';
import { homesService } from '@common/services';
import { useNotification } from './Notification';

// Données simulées pour les clients (avec ID SIGE)
const MOCK_CLIENTS = [
  { id: 1, sigeId: 'GUI-KAL-00001', nom: 'Mamadou Diallo', email: 'mamadou@test.com', telephone: '+224 621 00 00 01', ville: 'Conakry', quartier: 'Kaloum', compteurs: 2, statut: 'ACTIF', consommationMoyenne: 450, solde: 125000 },
  { id: 2, sigeId: 'GUI-RAT-00001', nom: 'Fatoumata Bah', email: 'fatoumata@test.com', telephone: '+224 621 00 00 02', ville: 'Conakry', quartier: 'Ratoma', compteurs: 1, statut: 'ACTIF', consommationMoyenne: 280, solde: 85000 },
  { id: 3, sigeId: 'GUI-CON-00001', nom: 'Ibrahima Sow', email: 'ibrahima@test.com', telephone: '+224 621 00 00 03', ville: 'Kindia', quartier: 'Centre', compteurs: 3, statut: 'SUSPENDU', consommationMoyenne: 620, solde: -15000 },
  { id: 4, sigeId: 'GUI-MAT-00001', nom: 'Aissatou Barry', email: 'aissatou@test.com', telephone: '+224 621 00 00 04', ville: 'Conakry', quartier: 'Matam', compteurs: 1, statut: 'ACTIF', consommationMoyenne: 320, solde: 200000 },
  { id: 5, sigeId: 'GUI-CON-00002', nom: 'Oumar Camara', email: 'oumar@test.com', telephone: '+224 621 00 00 05', ville: 'Labé', quartier: 'Daka', compteurs: 2, statut: 'ACTIF', consommationMoyenne: 510, solde: 95000 },
];

function ClientsManagement() {
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);

  // Charger les clients depuis l'API
  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      try {
        // Récupérer tous les foyers (qui contiennent les infos des propriétaires)
        const response = await homesService.getHomes();
        const homes = response.homes || [];
        
        // Grouper par propriétaire et formater les données
        const clientsMap = new Map();
        
        homes.forEach(home => {
          const owner = home.proprietaire;
          if (!owner) return;
          
          const clientId = owner.id;
          
          if (!clientsMap.has(clientId)) {
            clientsMap.set(clientId, {
              id: clientId,
              sigeId: owner.sigeId || owner.sige_id || null,
              clientType: owner.clientType || owner.client_type || (owner.role === 'ADMIN_ETAT' ? 'VIP' : 'USAGER'),
              nom: owner.nom,
              email: owner.email,
              telephone: owner.telephone || '',
              ville: home.ville || 'Conakry',
              quartier: home.quartier || '',
              compteurs: 0,
              statut: 'ACTIF',
              consommationMoyenne: 0,
              solde: 0,
              homes: [],
            });
          }
          
          const client = clientsMap.get(clientId);
          client.homes.push(home);
          client.compteurs += (home.meters?.length || 0);
        });
        
        // Convertir la Map en tableau
        const clientsList = Array.from(clientsMap.values());
        setClients(clientsList);
      } catch (error) {
        console.error('Erreur chargement clients:', error);
        // En cas d'erreur, garder les données mockées
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.ville.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.sigeId && client.sigeId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || client.statut === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: clients.length,
    actifs: clients.filter(c => c.statut === 'ACTIF').length,
    suspendus: clients.filter(c => c.statut === 'SUSPENDU').length,
    totalCompteurs: clients.reduce((sum, c) => sum + c.compteurs, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gestion des Clients
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {stats.total} clients enregistrés • {stats.totalCompteurs} compteurs actifs
          </p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-l-4 border-primary-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total clients</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.total}</p>
        </div>
        <div className="card bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-l-4 border-success-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.actifs}</p>
        </div>
        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-l-4 border-amber-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Suspendus</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.suspendus}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 dark:text-gray-400">Compteurs</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalCompteurs}</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, ville ou ID SIGE..."
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
              <option value="ACTIF">Actifs</option>
              <option value="SUSPENDU">Suspendus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="card overflow-hidden p-0">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden md:table-cell">ID SIGE</th>
                <th className="hidden sm:table-cell">Localisation</th>
                <th className="hidden md:table-cell">Contact</th>
                <th>Compteurs</th>
                <th className="hidden lg:table-cell">Consommation</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                        {client.nom.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{client.nom}</p>
                          {client.sigeId && (
                            <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 rounded text-xs font-mono font-bold text-primary-700 dark:text-primary-300">
                              {client.sigeId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 sm:hidden">{client.ville}</p>
                        {client.sigeId && (
                          <div className="flex items-center space-x-1 mt-1 md:hidden">
                            <QrCode className="w-3 h-3 text-primary-500" />
                            <span className="text-xs font-mono font-semibold text-primary-600 dark:text-primary-400">
                              {client.sigeId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell">
                    {client.clientType === 'VIP' ? (
                      <div className="flex items-center space-x-2 px-2 py-1 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-lg border border-amber-300 dark:border-amber-700">
                        <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">VIP</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 px-2 py-1 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg border border-blue-300 dark:border-blue-700">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Usager</span>
                      </div>
                    )}
                  </td>
                  <td className="hidden md:table-cell">
                    {client.sigeId ? (
                      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-lg border border-primary-300 dark:border-primary-700 shadow-sm">
                        <QrCode className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        <span className="font-mono text-sm font-bold text-primary-700 dark:text-primary-300">
                          {client.sigeId}
                        </span>
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        <span className="text-xs text-gray-400 italic">Non assigné</span>
                      </div>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{client.ville}, {client.quartier}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span>{client.email}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{client.telephone}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center space-x-1">
                      <Zap className="w-4 h-4 text-primary-500" />
                      <span className="font-semibold">{client.compteurs}</span>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell">
                    <span className="font-medium">{client.consommationMoyenne} kWh/mois</span>
                  </td>
                  <td>
                    <span className={`badge ${client.statut === 'ACTIF' ? 'badge-success' : 'badge-warning'}`}>
                      {client.statut}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Plus d'options"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun client trouvé</p>
          </div>
        )}
      </div>

      {/* Modal détails client */}
      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}

function ClientDetailModal({ client, onClose }) {
  const notify = useNotification();
  const [copied, setCopied] = useState(false);

  const handleCopySigeId = () => {
    if (client.sigeId) {
      navigator.clipboard.writeText(client.sigeId);
      setCopied(true);
      notify.success(`ID SIGE ${client.sigeId} copié dans le presse-papier`, { title: '✅ Copié' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {client.nom.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{client.nom}</h3>
                {client.clientType === 'VIP' ? (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30 rounded-lg border border-amber-300 dark:border-amber-700">
                    <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">VIP</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30 rounded-lg border border-blue-300 dark:border-blue-700">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Usager</span>
                  </div>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400">{client.email}</p>
              {client.sigeId && (
                <div className="flex items-center space-x-2 mt-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border-2 border-primary-300 dark:border-primary-700 shadow-sm">
                  <QrCode className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <span className="font-mono text-base font-bold text-primary-700 dark:text-primary-300">
                    {client.sigeId}
                  </span>
                  <button
                    onClick={handleCopySigeId}
                    className="ml-2 p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition-colors"
                    title="Copier l'ID SIGE"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {client.sigeId && (
            <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl border-2 border-primary-300 dark:border-primary-700 shadow-sm">
              <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-2 uppercase tracking-wide">ID SIGE - Référence Unique</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-200 dark:bg-primary-800 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-primary-700 dark:text-primary-300" />
                  </div>
                  <span className="font-mono text-xl font-bold text-primary-800 dark:text-primary-200">
                    {client.sigeId}
                  </span>
                </div>
                <button
                  onClick={handleCopySigeId}
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  title="Copier l'ID SIGE"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Copié!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Téléphone</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{client.telephone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Localisation</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{client.ville}, {client.quartier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Compteurs</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{client.compteurs}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Consommation moyenne</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{client.consommationMoyenne} kWh/mois</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Solde</p>
              <p className={`font-semibold ${client.solde >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                {client.solde.toLocaleString()} GNF
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
              <span className={`badge ${client.statut === 'ACTIF' ? 'badge-success' : 'badge-warning'}`}>
                {client.statut}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
          <button className="btn-primary">
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientsManagement;
