import { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { stateService } from '@common/services';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function FinancialSection() {
  const [loading, setLoading] = useState(true);
  const [financialGap, setFinancialGap] = useState(null);
  const [budgetData, setBudgetData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const gap = await stateService.getFinancialGap();
      setFinancialGap(gap);
      
      // Données simulées pour le budget
      setBudgetData([
        { mois: 'Jan', budget: 50000000, depense: 48000000 },
        { mois: 'Fév', budget: 50000000, depense: 52000000 },
        { mois: 'Mar', budget: 55000000, depense: 54000000 },
        { mois: 'Avr', budget: 55000000, depense: 58000000 },
        { mois: 'Mai', budget: 60000000, depense: 59000000 },
        { mois: 'Juin', budget: 60000000, depense: 62000000 },
      ]);
    } catch (error) {
      console.error('Erreur chargement financier:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  const deficitPercentage = financialGap?.deficitPercentage || 0;
  const isCritical = deficitPercentage > 30;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Gap Financier & Budget
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Analyse financière et suivi budgétaire national
        </p>
      </div>

      {/* Alert si déficit critique */}
      {isCritical && (
        <div className="card border-l-4 border-primary-500 bg-primary-50/30 dark:bg-primary-900/10 animate-slide-up">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-primary-800 dark:text-primary-300">
                Déficit Critique
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-400 mt-1">
                Le déficit dépasse 30%. Des mesures correctives sont nécessaires.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gap Financier Principal - Design simplifié */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card border-l-4 border-gray-400 hover:shadow-xl transition-all duration-300 animate-fade-in-scale">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Facture d'Achat
            </h3>
            <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {financialGap?.factureAchat 
              ? new Intl.NumberFormat('fr-FR').format(financialGap.factureAchat)
              : '0'} GNF
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Coût d'achat d'énergie
          </p>
        </div>

        <div className="card border-l-4 border-success-500 hover:shadow-xl transition-all duration-300 animate-fade-in-scale" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recettes Collectées
            </h3>
            <TrendingUp className="w-6 h-6 text-success-600" />
          </div>
          <p className="text-3xl font-bold text-success-600 dark:text-success-400">
            {financialGap?.recettesCollectees 
              ? new Intl.NumberFormat('fr-FR').format(financialGap.recettesCollectees)
              : '0'} GNF
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Revenus totaux
          </p>
        </div>

        <div className={`card border-l-4 hover:shadow-xl transition-all duration-300 animate-fade-in-scale ${isCritical ? 'border-primary-500' : 'border-gray-400'}`} style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Déficit
            </h3>
            <TrendingDown className={`w-6 h-6 ${isCritical ? 'text-primary-600' : 'text-gray-600'}`} />
          </div>
          <p className={`text-3xl font-bold ${isCritical ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {financialGap?.deficit 
              ? new Intl.NumberFormat('fr-FR').format(financialGap.deficit)
              : '0'} GNF
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {financialGap?.deficitPercentage?.toFixed(2) || 0}% du budget
          </p>
        </div>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Détails du Gap Financier
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Consommation Totale</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {financialGap?.consommationTotaleKWh?.toFixed(2) || 0} kWh
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Prix moyen/kWh</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                1,000 GNF
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-primary-200 dark:border-primary-800">
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Déficit</span>
              <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">
                {financialGap?.deficitPercentage?.toFixed(2) || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Évolution Budget vs Dépenses
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mois" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value) => new Intl.NumberFormat('fr-FR').format(value) + ' GNF'}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="budget" fill="#10b981" name="Budget" radius={[8, 8, 0, 0]} />
              <Bar dataKey="depense" fill="#ef4444" name="Dépenses" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommandations */}
      <div className="card border-l-4 border-primary-500 bg-gray-50 dark:bg-gray-700/30 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Recommandations Stratégiques
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start space-x-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Optimiser la production hydroélectrique pour réduire les coûts d'achat</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Renforcer la lutte contre la fraude pour améliorer les recettes</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Mettre en place des programmes d'efficacité énergétique</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Négocier de meilleurs tarifs d'achat avec les fournisseurs</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default FinancialSection;
