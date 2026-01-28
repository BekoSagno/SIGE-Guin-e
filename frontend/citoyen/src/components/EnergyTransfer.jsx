import { useState, useEffect } from 'react';
import { transferService, homesService } from '@common/services';
import { ArrowRight, Send, Lock, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotification } from './Notification';

function EnergyTransfer({ currentHomeId, canTransfer = true }) {
  const notify = useNotification();
  const [homes, setHomes] = useState([]);
  const [fromHomeId, setFromHomeId] = useState(currentHomeId);
  const [toHomeId, setToHomeId] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('GNF');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHomes();
    loadHistory();
  }, []);

  useEffect(() => {
    setFromHomeId(currentHomeId);
  }, [currentHomeId]);

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
      await transferService.transferEnergy(fromHomeId, toHomeId, parseFloat(amount), unit);
      setAmount('');
      setToHomeId('');
      loadHistory();
      notify.success(`${amount} ${unit} transféré vers ${toHome?.nom || 'le foyer'} avec succès !`, {
        title: '💸 Transfert effectué',
        duration: 5000,
      });
    } catch (error) {
      notify.error(error.response?.data?.error || 'Erreur lors du transfert', {
        title: 'Échec du transfert',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableHomes = homes.filter((h) => h.id !== fromHomeId);

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
    <div className="card animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 rounded-xl flex items-center justify-center">
          <Send className="w-6 h-6 text-accent-600 dark:text-accent-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Transfert d'Énergie</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Partagez de l'énergie ou du crédit entre vos foyers</p>
        </div>
      </div>

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
              <option value="GNF">GNF (Franc Guinéen)</option>
              <option value="Wh">Wh (Watt-heure)</option>
            </select>
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
  );
}

export default EnergyTransfer;
