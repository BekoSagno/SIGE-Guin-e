import { useState, useEffect } from 'react';
import { transferService, homesService, billsService } from '@common/services';
import { ArrowRight, Send, Lock, Activity, AlertCircle, CheckCircle, FileText, CreditCard, Wallet, Smartphone, Building2, Banknote, Clock } from 'lucide-react';
import { useNotification } from './Notification';

function EnergyTransfer({ currentHomeId, canTransfer = true }) {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' ou 'bills'
  const [homes, setHomes] = useState([]);
  const [fromHomeId, setFromHomeId] = useState(currentHomeId);
  const [toHomeId, setToHomeId] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('GNF');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // États pour les factures
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [payingBill, setPayingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [billsFilter, setBillsFilter] = useState('ALL');

  useEffect(() => {
    loadHomes();
    loadHistory();
    if (currentHomeId) {
      loadBills();
      loadBalance();
    }
  }, []);

  useEffect(() => {
    setFromHomeId(currentHomeId);
    if (currentHomeId) {
      loadBills();
      loadBalance();
    }
  }, [currentHomeId, billsFilter]);

  const loadHomes = async () => {
    try {
      const data = await homesService.getHomes();
      setHomes(data.homes || []);
    } catch (error) {
      console.error('Erreur chargement foyers:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await transferService.getHistory();
      setHistory(data.transactions || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const toHome = homes.find(h => h.id === toHomeId);
      const response = await transferService.transferEnergy(fromHomeId, toHomeId, parseFloat(amount), unit);
      
      // Calculer le quota en kWh si c'est un transfert en GNF
      let quotaKwh = null;
      if (unit === 'GNF') {
        const tariffPerKwh = 1000; // Taux: 1 kWh = 1000 GNF
        quotaKwh = parseFloat(amount) / tariffPerKwh;
      }
      
      setAmount('');
      setToHomeId('');
      loadHistory();
      
      const message = quotaKwh 
        ? `${amount} ${unit} (${quotaKwh.toFixed(4)} kWh) transféré vers ${toHome?.nom || 'le foyer'} avec succès ! Le Kit IoT a été notifié.`
        : `${amount} ${unit} transféré vers ${toHome?.nom || 'le foyer'} avec succès !`;
      
      notify.success(message, {
        title: '💸 Transfert effectué',
        duration: 6000,
      });
    } catch (error) {
      notify.error(error.response?.data?.error || 'Erreur lors du transfert', {
        title: 'Échec du transfert',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    try {
      setBillsLoading(true);
      const status = billsFilter !== 'ALL' ? billsFilter : null;
      const data = await billsService.getBills(currentHomeId, status);
      setBills(data.bills || []);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
      notify.error('Erreur lors du chargement des factures', { title: 'Erreur' });
    } finally {
      setBillsLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const data = await transferService.getBalance(currentHomeId);
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Erreur chargement solde:', error);
    }
  };

  const handlePayBill = async (bill) => {
    if (!bill) return;
    setSelectedBill(bill);
    const remainingAmount = bill.totalAmount - (bill.paidAmount || 0);
    setPaymentAmount(remainingAmount.toString());
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;

    setPayingBill(selectedBill.id);

    try {
      const amount = parseFloat(paymentAmount);
      const remainingAmount = selectedBill.totalAmount - (selectedBill.paidAmount || 0);

      if (amount > remainingAmount) {
        notify.error(`Le montant ne peut pas dépasser ${remainingAmount.toFixed(2)} GNF`, { title: 'Montant invalide' });
        setPayingBill(null);
        return;
      }

      if (paymentMethod === 'WALLET' && amount > balance) {
        notify.error('Solde insuffisant dans votre portefeuille', { title: 'Solde insuffisant' });
        setPayingBill(null);
        return;
      }

      await billsService.payBill(selectedBill.id, {
        paymentMethod,
        amount,
        paymentReference: paymentMethod === 'MOBILE_MONEY' ? `OM-${Date.now()}` : null,
      });

      notify.success(`Paiement de ${amount.toFixed(2)} GNF effectué avec succès`, {
        title: '✅ Paiement réussi',
        duration: 5000,
      });

      setSelectedBill(null);
      setPaymentAmount('');
      loadBills();
      loadBalance();
    } catch (error) {
      console.error('Erreur paiement:', error);
      notify.error(error.response?.data?.error || 'Erreur lors du paiement', { title: 'Échec du paiement' });
    } finally {
      setPayingBill(null);
    }
  };

  const getStatusBadge = (status, dueDate) => {
    const isOverdue = status === 'PENDING' && new Date(dueDate) < new Date();
    const actualStatus = isOverdue ? 'OVERDUE' : status;

    switch (actualStatus) {
      case 'PAID':
        return { icon: CheckCircle, color: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400', label: 'Payée' };
      case 'PENDING':
        return { icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'En attente' };
      case 'OVERDUE':
        return { icon: AlertCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'En retard' };
      default:
        return { icon: FileText, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400', label: status };
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'WALLET': return Wallet;
      case 'MOBILE_MONEY': return Smartphone;
      case 'BANK_TRANSFER': return Building2;
      case 'CASH': return Banknote;
      default: return CreditCard;
    }
  };

  const availableHomes = homes.filter((h) => h.id !== fromHomeId);
  const filteredBills = bills.filter(bill => {
    if (billsFilter === 'ALL') return true;
    if (billsFilter === 'OVERDUE') {
      return bill.status === 'PENDING' && new Date(bill.dueDate) < new Date();
    }
    return bill.status === billsFilter;
  });

  if (!canTransfer) {
    return (
      <div className="card opacity-75 animate-fade-in">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transfert d'Énergie</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Partagez de l'énergie entre vos foyers</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Seul un administrateur peut effectuer des transferts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête avec onglets */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transfert d'Énergie & Factures</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transférez de l'énergie entre vos foyers ou payez vos factures EDG
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 border-b-2 border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${
              activeTab === 'transfer'
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Transfert d'Énergie
            </span>
            {activeTab === 'transfer' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-600 dark:bg-accent-400"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-6 py-3 font-semibold text-sm transition-all relative ${
              activeTab === 'bills'
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Paiement Factures EDG
            </span>
            {activeTab === 'bills' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-600 dark:bg-accent-400"></span>
            )}
          </button>
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'transfer' ? (
        <div className="card">

      <form onSubmit={handleTransfer} className="space-y-5 mb-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Foyer source
          </label>
          <select
            value={fromHomeId}
            onChange={(e) => setFromHomeId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-medium"
            required
          >
            {homes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.nom} ({home.ville})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center py-2">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-full flex items-center justify-center animate-bounce-slow">
            <ArrowRight className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Foyer destination
          </label>
          <select
            value={toHomeId}
            onChange={(e) => setToHomeId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-medium"
            required
          >
            <option value="">Sélectionner un foyer</option>
            {availableHomes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.nom} ({home.ville})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Montant
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-semibold"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Type
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-semibold"
            >
              <option value="GNF">GNF (Franc Guinéen) - Crée un quota kWh</option>
              <option value="Wh">Wh (Watt-heure) - Transfert direct</option>
            </select>
            {unit === 'GNF' && amount && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                💡 Quota équivalent: {(parseFloat(amount) / 1000).toFixed(4)} kWh
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !toHomeId}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Transfert en cours...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Effectuer le transfert</span>
            </>
          )}
        </button>
      </form>

      {history.length > 0 && (
        <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600" />
            Historique des transferts
          </h4>
          <div className="space-y-2">
            {history.slice(0, 5).map((transaction, index) => (
              <div
                key={transaction.id}
                className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <ArrowRight className="w-4 h-4 text-accent-500" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                      <span className="text-primary-600 dark:text-primary-400">{transaction.fromHome.nom}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-success-600 dark:text-success-400">{transaction.toHome.nom}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-lg text-gray-900 dark:text-gray-100">
                      {transaction.amount} {transaction.unit}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {new Date(transaction.createdAt).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      ) : (
        /* Onglet Paiement Factures EDG */
        <div className="card">
          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['ALL', 'PENDING', 'PAID', 'OVERDUE'].map((status) => (
              <button
                key={status}
                onClick={() => setBillsFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  billsFilter === status
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'ALL' ? 'Toutes' : status === 'PENDING' ? 'En attente' : status === 'PAID' ? 'Payées' : 'En retard'}
              </button>
            ))}
          </div>

          {/* Liste des factures */}
          {billsLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des factures...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {billsFilter === 'ALL' ? 'Aucune facture disponible' : `Aucune facture ${billsFilter === 'PENDING' ? 'en attente' : billsFilter === 'PAID' ? 'payée' : 'en retard'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBills.map((bill) => {
                const statusBadge = getStatusBadge(bill.status, bill.dueDate);
                const StatusIcon = statusBadge.icon;
                const remainingAmount = bill.totalAmount - (bill.paidAmount || 0);
                const isFullyPaid = remainingAmount <= 0;

                return (
                  <div
                    key={bill.id}
                    className="p-5 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusIcon className={`w-5 h-5 ${statusBadge.color.replace('bg-', 'text-').split(' ')[0]}`} />
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {new Date(bill.dueDate) < new Date() && bill.status !== 'PAID' && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-semibold">
                              Échue
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                          Période: {new Date(bill.billingPeriod.start).toLocaleDateString('fr-FR')} - {new Date(bill.billingPeriod.end).toLocaleDateString('fr-FR')}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Consommation</p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{bill.consumptionKwh.toFixed(2)} kWh</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Montant total</p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{bill.totalAmount.toLocaleString('fr-FR')} GNF</p>
                          </div>
                          {bill.paidAmount > 0 && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Payé</p>
                              <p className="font-semibold text-success-600 dark:text-success-400">{bill.paidAmount.toLocaleString('fr-FR')} GNF</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Reste à payer</p>
                            <p className={`font-semibold ${remainingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-success-600 dark:text-success-400'}`}>
                              {remainingAmount.toLocaleString('fr-FR')} GNF
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Échéance: {new Date(bill.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      {!isFullyPaid && (
                        <button
                          onClick={() => handlePayBill(bill)}
                          className="btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Payer</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de paiement */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedBill(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in-scale"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary-600" />
                Payer la facture
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Montant restant: {(selectedBill.totalAmount - (selectedBill.paidAmount || 0)).toLocaleString('fr-FR')} GNF
              </p>
            </div>
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Méthode de paiement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['WALLET', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH'].map((method) => {
                    const Icon = getPaymentMethodIcon(method);
                    const labels = {
                      WALLET: 'Portefeuille',
                      MOBILE_MONEY: 'Mobile Money',
                      BANK_TRANSFER: 'Virement',
                      CASH: 'Espèces',
                    };
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          paymentMethod === method
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === method ? 'text-primary-600' : 'text-gray-400'}`} />
                        <p className={`text-xs font-semibold ${paymentMethod === method ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'}`}>
                          {labels[method]}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {paymentMethod === 'WALLET' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Solde disponible: {balance.toLocaleString('fr-FR')} GNF
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Montant à payer (GNF)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedBill.totalAmount - (selectedBill.paidAmount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all font-semibold"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={payingBill === selectedBill.id}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {payingBill === selectedBill.id ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Paiement...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Payer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnergyTransfer;
