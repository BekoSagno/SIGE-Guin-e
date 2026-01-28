import { useState, useEffect } from 'react';
import { Map, MapPin, TrendingUp, Users, Zap } from 'lucide-react';
import { stateService } from '@common/services';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function GeographicSection() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getNationalStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement géographique:', error);
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

  // Données simulées par région
  const regionsData = [
    { region: 'Conakry', foyers: 45000, consommation: 125000, recettes: 118000, rendement: 85 },
    { region: 'Kindia', foyers: 18000, consommation: 45000, recettes: 38000, rendement: 78 },
    { region: 'Kankan', foyers: 15000, consommation: 38000, recettes: 30000, rendement: 72 },
    { region: 'Labé', foyers: 12000, consommation: 30000, recettes: 25000, rendement: 80 },
    { region: 'Mamou', foyers: 10000, consommation: 25000, recettes: 21000, rendement: 75 },
    { region: 'Nzérékoré', foyers: 8000, consommation: 20000, recettes: 17000, rendement: 73 },
  ];

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Cartographie Nationale
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Répartition géographique et performance par région
        </p>
      </div>

      {/* Statistiques par région */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regionsData.map((region) => (
          <div key={region.region} className="card border-l-4 border-primary-500 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  {region.region}
                </h3>
              </div>
              <span className={`badge ${
                region.rendement >= 80 ? 'badge-success' :
                region.rendement >= 70 ? 'badge-warning' : 'badge-danger'
              }`}>
                {region.rendement}%
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Foyers</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {region.foyers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Consommation</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {region.consommation.toLocaleString()} kWh
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recettes</span>
                <span className="font-semibold text-success-600 dark:text-success-400">
                  {region.recettes.toLocaleString()} GNF
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Rendement</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          region.rendement >= 80 ? 'bg-success-500' :
                          region.rendement >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${region.rendement}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {region.rendement}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Répartition des Foyers par Région
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={regionsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ region, percent }) => `${region}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="foyers"
              >
                {regionsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Rendement par Région
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="region" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar 
                dataKey="rendement" 
                fill="#0ea5e9" 
                name="Rendement (%)" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Carte interactive (placeholder) */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Carte Interactive de la Guinée
        </h3>
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden" style={{ height: '400px' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Carte interactive à intégrer (Leaflet/Mapbox)
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Affichage des régions avec statistiques au survol
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé national */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Foyers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {regionsData.reduce((sum, r) => sum + r.foyers, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Consommation Totale</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {regionsData.reduce((sum, r) => sum + r.consommation, 0).toLocaleString()} kWh
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rendement Moyen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(regionsData.reduce((sum, r) => sum + r.rendement, 0) / regionsData.length)}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Map className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Régions Actives</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {regionsData.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeographicSection;
