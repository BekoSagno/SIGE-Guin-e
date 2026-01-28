import { useState, useEffect } from 'react';
import { 
  Send, Users, MapPin, Building, Home, Radio, Search, Check, X,
  MessageSquare, Bell, AlertTriangle, Zap, Clock, Calendar, Filter,
  ChevronDown, ChevronRight, Eye, Trash2, Copy, Globe, User,
  CheckCircle, XCircle, Loader
} from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';

// Types de messages prédéfinis
const MESSAGE_TEMPLATES = [
  {
    id: 'maintenance',
    icon: '🔧',
    title: 'Maintenance planifiée',
    template: 'Chers abonnés, une maintenance est prévue le {date} de {heureDebut} à {heureFin}. Votre alimentation sera temporairement interrompue. Merci de votre compréhension.',
    type: 'info',
  },
  {
    id: 'coupure',
    icon: '⚡',
    title: 'Coupure programmée',
    template: 'Information importante : Une coupure de courant est programmée le {date} dans votre zone pour des travaux sur le réseau. Durée estimée : {duree}.',
    type: 'warning',
  },
  {
    id: 'retablissement',
    icon: '✅',
    title: 'Rétablissement',
    template: 'Bonne nouvelle ! L\'alimentation électrique a été rétablie dans votre zone. Nous vous remercions de votre patience.',
    type: 'success',
  },
  {
    id: 'incident',
    icon: '🚨',
    title: 'Incident en cours',
    template: 'Un incident technique affecte actuellement votre zone. Nos équipes sont mobilisées. Rétablissement prévu : {heureEstimee}.',
    type: 'danger',
  },
  {
    id: 'facture',
    icon: '📄',
    title: 'Rappel facture',
    template: 'Rappel : Votre facture d\'électricité du mois de {mois} est disponible. Montant : {montant} GNF. Date limite de paiement : {dateLimite}.',
    type: 'info',
  },
  {
    id: 'economie',
    icon: '💡',
    title: 'Conseil économie',
    template: 'Conseil énergie : Pendant les heures de pointe ({heurePointe}), réduisez votre consommation pour économiser et aider le réseau. Merci !',
    type: 'info',
  },
  {
    id: 'custom',
    icon: '✏️',
    title: 'Message personnalisé',
    template: '',
    type: 'info',
  },
];

// Données simulées des zones/secteurs
const MOCK_ZONES = [
  {
    id: 'CONAKRY',
    name: 'Conakry',
    type: 'ville',
    subscribers: 45000,
    communes: [
      {
        id: 'KALOUM',
        name: 'Kaloum',
        subscribers: 8500,
        quartiers: [
          { id: 'KALOUM-CENTRE', name: 'Kaloum Centre', subscribers: 2500 },
          { id: 'BOULBINET', name: 'Boulbinet', subscribers: 1800 },
          { id: 'TEMENETAYE', name: 'Téminétaye', subscribers: 2200 },
          { id: 'SANDERVALIA', name: 'Sandervalia', subscribers: 2000 },
        ],
      },
      {
        id: 'DIXINN',
        name: 'Dixinn',
        subscribers: 12000,
        quartiers: [
          { id: 'DIXINN-CENTRE', name: 'Dixinn Centre', subscribers: 3500 },
          { id: 'BELLE-VUE', name: 'Belle Vue', subscribers: 2800 },
          { id: 'CAMEROUN', name: 'Cameroun', subscribers: 3200 },
          { id: 'LANDREAH', name: 'Landréah', subscribers: 2500 },
        ],
      },
      {
        id: 'RATOMA',
        name: 'Ratoma',
        subscribers: 15000,
        quartiers: [
          { id: 'RATOMA-CENTRE', name: 'Ratoma Centre', subscribers: 4000 },
          { id: 'KAPORO', name: 'Kaporo', subscribers: 3500 },
          { id: 'KOLOMA', name: 'Koloma', subscribers: 4200 },
          { id: 'NONGO', name: 'Nongo', subscribers: 3300 },
        ],
      },
      {
        id: 'MATOTO',
        name: 'Matoto',
        subscribers: 9500,
        quartiers: [
          { id: 'MATOTO-CENTRE', name: 'Matoto Centre', subscribers: 2800 },
          { id: 'ENTA', name: 'Enta', subscribers: 2400 },
          { id: 'DABOMPA', name: 'Dabompa', subscribers: 2200 },
          { id: 'SONFONIA', name: 'Sonfonia', subscribers: 2100 },
        ],
      },
    ],
  },
];

// Historique des messages envoyés
const MOCK_SENT_MESSAGES = [
  {
    id: 'MSG-001',
    title: 'Maintenance planifiée - Dixinn',
    content: 'Chers abonnés, une maintenance est prévue le 20/01/2025 de 08h00 à 14h00...',
    type: 'info',
    targetType: 'commune',
    targetName: 'Dixinn',
    recipients: 12000,
    delivered: 11850,
    read: 8420,
    sentAt: new Date(Date.now() - 86400000).toISOString(),
    sentBy: 'Agent Camara',
  },
  {
    id: 'MSG-002',
    title: 'Incident résolu - Ratoma',
    content: 'Bonne nouvelle ! L\'alimentation électrique a été rétablie dans votre zone...',
    type: 'success',
    targetType: 'quartier',
    targetName: 'Kaporo',
    recipients: 3500,
    delivered: 3480,
    read: 2890,
    sentAt: new Date(Date.now() - 43200000).toISOString(),
    sentBy: 'Agent Diallo',
  },
  {
    id: 'MSG-003',
    title: 'Rappel facture',
    content: 'Rappel : Votre facture d\'électricité du mois de Décembre est disponible...',
    type: 'info',
    targetType: 'individual',
    targetName: 'Mamadou Diallo',
    recipients: 1,
    delivered: 1,
    read: 1,
    sentAt: new Date(Date.now() - 7200000).toISOString(),
    sentBy: 'Système',
  },
];

function BroadcastModule() {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('compose'); // compose, history, templates
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [targetMode, setTargetMode] = useState('zone'); // zone, individual
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [expandedZones, setExpandedZones] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [scheduleMode, setScheduleMode] = useState('now'); // now, scheduled
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState(MOCK_SENT_MESSAGES);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [previewMode, setPreviewMode] = useState(false);

  // Clients individuels simulés
  const mockIndividuals = [
    { id: 'CLI-001', name: 'Mamadou Diallo', phone: '+224 621 00 00 01', zone: 'Dixinn', meter: 'MTR-001' },
    { id: 'CLI-002', name: 'Fatoumata Bah', phone: '+224 621 00 00 02', zone: 'Ratoma', meter: 'MTR-002' },
    { id: 'CLI-003', name: 'Ibrahima Sow', phone: '+224 621 00 00 03', zone: 'Matoto', meter: 'MTR-003' },
    { id: 'CLI-004', name: 'Aissatou Barry', phone: '+224 621 00 00 04', zone: 'Kaloum', meter: 'MTR-004' },
    { id: 'CLI-005', name: 'Oumar Camara', phone: '+224 621 00 00 05', zone: 'Dixinn', meter: 'MTR-005' },
  ];

  // Calculer le nombre total de destinataires
  const calculateRecipients = () => {
    if (targetMode === 'individual') {
      return selectedIndividuals.length;
    }
    
    let total = 0;
    selectedTargets.forEach(targetId => {
      // Chercher dans les communes
      MOCK_ZONES.forEach(ville => {
        if (ville.id === targetId) {
          total += ville.subscribers;
        }
        ville.communes.forEach(commune => {
          if (commune.id === targetId) {
            total += commune.subscribers;
          }
          commune.quartiers.forEach(quartier => {
            if (quartier.id === targetId) {
              total += quartier.subscribers;
            }
          });
        });
      });
    });
    return total;
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setMessageTitle(template.title);
    setMessageContent(template.template);
    setMessageType(template.type);
  };

  const toggleZoneExpand = (zoneId) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  const toggleTarget = (targetId) => {
    setSelectedTargets(prev => 
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const toggleIndividual = (client) => {
    setSelectedIndividuals(prev =>
      prev.find(c => c.id === client.id)
        ? prev.filter(c => c.id !== client.id)
        : [...prev, client]
    );
  };

  const handleSend = () => {
    const recipients = calculateRecipients();
    
    if (recipients === 0) {
      notify.error('Veuillez sélectionner au moins un destinataire');
      return;
    }
    
    if (!messageTitle.trim()) {
      notify.error('Veuillez saisir un titre pour le message');
      return;
    }
    
    if (!messageContent.trim()) {
      notify.error('Veuillez saisir le contenu du message');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Confirmer l\'envoi ?',
      message: `Ce message sera envoyé à ${recipients.toLocaleString()} destinataire(s)${scheduleMode === 'scheduled' ? ` le ${scheduledDate} à ${scheduledTime}` : ' immédiatement'}.`,
      type: 'info',
      confirmText: scheduleMode === 'scheduled' ? 'Programmer' : 'Envoyer maintenant',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setSending(true);

        // Simuler l'envoi
        await new Promise(resolve => setTimeout(resolve, 2500));

        const newMessage = {
          id: `MSG-${Date.now()}`,
          title: messageTitle,
          content: messageContent,
          type: messageType,
          targetType: targetMode === 'individual' ? 'individual' : 
            selectedTargets.length === 1 ? 'zone' : 'multiple',
          targetName: targetMode === 'individual' 
            ? selectedIndividuals.map(c => c.name).join(', ')
            : selectedTargets.join(', '),
          recipients,
          delivered: Math.floor(recipients * 0.98),
          read: 0,
          sentAt: new Date().toISOString(),
          sentBy: 'Agent EDG',
          scheduled: scheduleMode === 'scheduled' ? `${scheduledDate} ${scheduledTime}` : null,
        };

        setSentMessages(prev => [newMessage, ...prev]);
        setSending(false);

        // Reset form
        setMessageTitle('');
        setMessageContent('');
        setSelectedTargets([]);
        setSelectedIndividuals([]);
        setSelectedTemplate(null);

        notify.success(
          scheduleMode === 'scheduled' 
            ? `Message programmé pour ${recipients.toLocaleString()} destinataires`
            : `Message envoyé à ${recipients.toLocaleString()} destinataires`,
          {
            title: scheduleMode === 'scheduled' ? '📅 Programmé' : '✅ Envoyé',
            duration: 5000,
          }
        );

        setActiveTab('history');
      },
    });
  };

  const filteredIndividuals = mockIndividuals.filter(client =>
    client.name.toLowerCase().includes(individualSearch.toLowerCase()) ||
    client.phone.includes(individualSearch) ||
    client.zone.toLowerCase().includes(individualSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Centre de Diffusion
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Communication avec les usagers - SMS, Push, Email
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
        {[
          { id: 'compose', label: 'Nouveau message', icon: MessageSquare },
          { id: 'history', label: 'Historique', icon: Clock },
          { id: 'templates', label: 'Modèles', icon: Copy },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche: Sélection des destinataires */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary-500" />
                <span>Destinataires</span>
              </h3>

              {/* Mode de ciblage */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setTargetMode('zone')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    targetMode === 'zone'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Globe className="w-4 h-4 inline mr-1" />
                  Par zone
                </button>
                <button
                  onClick={() => setTargetMode('individual')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    targetMode === 'individual'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-1" />
                  Individuel
                </button>
              </div>

              {targetMode === 'zone' ? (
                <>
                  {/* Arborescence des zones */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {MOCK_ZONES.map((ville) => (
                      <div key={ville.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Ville */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50">
                          <button
                            onClick={() => toggleZoneExpand(ville.id)}
                            className="flex items-center space-x-2 flex-1"
                          >
                            {expandedZones[ville.id] ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <Building className="w-4 h-4 text-primary-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{ville.name}</span>
                            <span className="text-xs text-gray-500">({ville.subscribers.toLocaleString()})</span>
                          </button>
                          <button
                            onClick={() => toggleTarget(ville.id)}
                            className={`w-6 h-6 rounded flex items-center justify-center ${
                              selectedTargets.includes(ville.id)
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                          >
                            {selectedTargets.includes(ville.id) && <Check className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Communes */}
                        {expandedZones[ville.id] && (
                          <div className="pl-4">
                            {ville.communes.map((commune) => (
                              <div key={commune.id}>
                                <div className="flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-700">
                                  <button
                                    onClick={() => toggleZoneExpand(commune.id)}
                                    className="flex items-center space-x-2 flex-1"
                                  >
                                    {expandedZones[commune.id] ? (
                                      <ChevronDown className="w-3 h-3 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-gray-400" />
                                    )}
                                    <MapPin className="w-3 h-3 text-amber-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{commune.name}</span>
                                    <span className="text-xs text-gray-500">({commune.subscribers.toLocaleString()})</span>
                                  </button>
                                  <button
                                    onClick={() => toggleTarget(commune.id)}
                                    className={`w-5 h-5 rounded flex items-center justify-center ${
                                      selectedTargets.includes(commune.id)
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-600'
                                    }`}
                                  >
                                    {selectedTargets.includes(commune.id) && <Check className="w-3 h-3" />}
                                  </button>
                                </div>

                                {/* Quartiers */}
                                {expandedZones[commune.id] && (
                                  <div className="pl-6">
                                    {commune.quartiers.map((quartier) => (
                                      <div
                                        key={quartier.id}
                                        className="flex items-center justify-between p-2 border-t border-gray-50 dark:border-gray-800"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <Home className="w-3 h-3 text-success-500" />
                                          <span className="text-xs text-gray-600 dark:text-gray-400">{quartier.name}</span>
                                          <span className="text-xs text-gray-400">({quartier.subscribers.toLocaleString()})</span>
                                        </div>
                                        <button
                                          onClick={() => toggleTarget(quartier.id)}
                                          className={`w-4 h-4 rounded flex items-center justify-center ${
                                            selectedTargets.includes(quartier.id)
                                              ? 'bg-primary-500 text-white'
                                              : 'bg-gray-200 dark:bg-gray-600'
                                          }`}
                                        >
                                          {selectedTargets.includes(quartier.id) && <Check className="w-2 h-2" />}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Recherche individuelle */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      value={individualSearch}
                      onChange={(e) => setIndividualSearch(e.target.value)}
                      className="input pl-10 text-sm"
                    />
                  </div>

                  {/* Liste des clients */}
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {filteredIndividuals.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => toggleIndividual(client)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedIndividuals.find(c => c.id === client.id)
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{client.name}</p>
                            <p className="text-xs text-gray-500">{client.phone} • {client.zone}</p>
                          </div>
                          {selectedIndividuals.find(c => c.id === client.id) && (
                            <CheckCircle className="w-5 h-5 text-primary-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Résumé des destinataires */}
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-700 dark:text-primary-300">Destinataires sélectionnés</span>
                  <span className="text-lg font-bold text-primary-600">{calculateRecipients().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite: Composition du message */}
          <div className="lg:col-span-2 space-y-4">
            {/* Modèles rapides */}
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Modèles rapides</h3>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                      selectedTemplate?.id === template.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{template.icon}</span>
                    <span>{template.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulaire de message */}
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                <span>Composer le message</span>
              </h3>

              <div className="space-y-4">
                {/* Type de message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type de notification
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'info', label: 'Information', color: 'primary' },
                      { id: 'warning', label: 'Avertissement', color: 'amber' },
                      { id: 'danger', label: 'Urgent', color: 'red' },
                      { id: 'success', label: 'Bonne nouvelle', color: 'success' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setMessageType(type.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          messageType === type.id
                            ? `bg-${type.color}-500 text-white`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Titre du message
                  </label>
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="Ex: Maintenance planifiée - Dixinn"
                    className="input"
                  />
                </div>

                {/* Contenu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contenu du message
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Rédigez votre message ici..."
                    rows={5}
                    className="input resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {messageContent.length}/500 caractères
                  </p>
                </div>

                {/* Programmation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Envoi
                  </label>
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => setScheduleMode('now')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        scheduleMode === 'now'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Send className="w-4 h-4 inline mr-1" />
                      Immédiat
                    </button>
                    <button
                      onClick={() => setScheduleMode('scheduled')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        scheduleMode === 'scheduled'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Programmer
                    </button>
                  </div>

                  {scheduleMode === 'scheduled' && (
                    <div className="flex space-x-3">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="input flex-1"
                      />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="input w-32"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setPreviewMode(true)}
                  className="btn-secondary flex-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>Aperçu</span>
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || calculateRecipients() === 0}
                  className="btn-primary flex-1"
                >
                  {sending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {sending ? 'Envoi en cours...' : 
                      scheduleMode === 'scheduled' ? 'Programmer' : 'Envoyer'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <HistoryTab messages={sentMessages} />
      )}

      {activeTab === 'templates' && (
        <TemplatesTab templates={MESSAGE_TEMPLATES} onSelect={(t) => { handleTemplateSelect(t); setActiveTab('compose'); }} />
      )}

      {/* Modal aperçu */}
      {previewMode && (
        <PreviewModal
          title={messageTitle}
          content={messageContent}
          type={messageType}
          recipients={calculateRecipients()}
          onClose={() => setPreviewMode(false)}
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

// Composant Historique
function HistoryTab({ messages }) {
  const getTypeConfig = (type) => {
    switch (type) {
      case 'success': return { bg: 'bg-success-100 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-300', icon: CheckCircle };
      case 'warning': return { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: AlertTriangle };
      case 'danger': return { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: AlertTriangle };
      default: return { bg: 'bg-primary-100 dark:bg-primary-900/20', text: 'text-primary-700 dark:text-primary-300', icon: Bell };
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Messages envoyés</h3>
          <span className="badge-info">{messages.length} messages</span>
        </div>

        <div className="space-y-3">
          {messages.map((msg) => {
            const config = getTypeConfig(msg.type);
            const Icon = config.icon;
            const deliveryRate = Math.round((msg.delivered / msg.recipients) * 100);
            const readRate = Math.round((msg.read / msg.delivered) * 100);

            return (
              <div key={msg.id} className={`p-4 rounded-xl ${config.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <Icon className={`w-5 h-5 ${config.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{msg.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{msg.content}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{msg.recipients.toLocaleString()} dest.</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-success-500" />
                          <span>{deliveryRate}% livré</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Eye className="w-3 h-3 text-primary-500" />
                          <span>{readRate}% lu</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(msg.sentAt).toLocaleString('fr-FR')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="badge-info whitespace-nowrap">{msg.targetName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Composant Modèles
function TemplatesTab({ templates, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className="card hover:shadow-lg transition-all cursor-pointer"
          onClick={() => onSelect(template)}
        >
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-3xl">{template.icon}</span>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">{template.title}</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {template.template || 'Message personnalisable'}
          </p>
          <button className="mt-4 w-full btn-secondary text-sm">
            Utiliser ce modèle
          </button>
        </div>
      ))}
    </div>
  );
}

// Modal d'aperçu
function PreviewModal({ title, content, type, recipients, onClose }) {
  const getTypeStyle = (type) => {
    switch (type) {
      case 'success': return 'border-success-500 bg-success-50 dark:bg-success-900/20';
      case 'warning': return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'danger': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default: return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Aperçu du message
          </h3>
          <p className="text-sm text-gray-500">{recipients.toLocaleString()} destinataires</p>
        </div>
        
        <div className="p-6">
          {/* Simulation notification mobile */}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 shadow-inner">
            <div className={`p-4 rounded-xl border-l-4 ${getTypeStyle(type)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-gray-500">SIGE-Guinée • maintenant</span>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title || 'Titre du message'}</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{content || 'Contenu du message...'}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="w-full btn-secondary">
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
}

export default BroadcastModule;
