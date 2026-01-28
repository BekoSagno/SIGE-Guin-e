import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { stateService } from '@common/services';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

function AnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getNationalStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Données simulées pour les graphiques temporels
  const consumptionData = [
    { date: 'Jan', consommation: 45000, recettes: 42000 },
    { date: 'Fév', consommation: 48000, recettes: 45000 },
    { date: 'Mar', consommation: 52000, recettes: 49000 },
    { date: 'Avr', consommation: 49000, recettes: 47000 },
    { date: 'Mai', consommation: 55000, recettes: 52000 },
    { date: 'Juin', consommation: 58000, recettes: 55000 },
  ];

  const efficiencyData = [
    { zone: 'Conakry', rendement: 85, pertes: 15 },
    { zone: 'Kindia', rendement: 78, pertes: 22 },
    { zone: 'Kankan', rendement: 72, pertes: 28 },
    { zone: 'Labé', rendement: 80, pertes: 20 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytique Nationale
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Analyses approfondies et tendances énergétiques
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="input w-auto"
        >
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="90d">3 derniers mois</option>
          <option value="1y">1 an</option>
        </select>
      </div>

      {/* Graphique Consommation vs Recettes */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Évolution Consommation vs Recettes
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={consumptionData}>
            <defs>
              <linearGradient id="colorConsommation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRecettes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="consommation" 
              stroke="#0ea5e9" 
              fillOpacity={1} 
              fill="url(#colorConsommation)" 
              name="Consommation (kWh)"
            />
            <Area 
              type="monotone" 
              dataKey="recettes" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorRecettes)" 
              name="Recettes (GNF)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rendement par Zone */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Rendement de Distribution par Zone
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={efficiencyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="zone" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Bar dataKey="rendement" fill="#10b981" name="Rendement (%)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="pertes" fill="#ef4444" name="Pertes (%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistiques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rendement Moyen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">78.5%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pertes Moyennes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">21.5%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Croissance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">+5.2%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsSection;
