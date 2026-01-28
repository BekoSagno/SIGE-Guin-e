import { useState, useEffect } from 'react';
import { Heart, Building2, GraduationCap, DollarSign, TrendingUp, Users } from 'lucide-react';
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

function SocialImpactSection() {
  const [loading, setLoading] = useState(true);
  const [socialData, setSocialData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getSocialImpact();
      setSocialData(data);
    } catch (error) {
      console.error('Erreur chargement social-impact:', error);
      // Données par défaut en cas d'erreur
      setSocialData({
        ravitaillementVital: {
          hospitals: { total: 0, withPower: 0, coveragePercent: 0 },
          schools: { total: 0, withPower: 0, coveragePercent: 0 },
        },
        pouvoirAchat: {
          totalSavingsGNF: 0,
          familiesBenefiting: 0,
          avgSavingsPerFamily: 0,
          message: 'Aucune donnée disponible pour le moment.',
        },
        metricsByRegion: [],
      });
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

  const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Analyse d'Impact Social
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Mesure de l'impact de l'énergie sur la vie des citoyens
        </p>
      </div>

      {/* Ravitaillement Vital */}
      {socialData?.ravitaillementVital && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border-l-4 border-primary-500 hover:shadow-xl transition-all duration-300 animate-fade-in-scale">
            <div className="flex items-center space-x-3 mb-4">
              <Building2 className="w-8 h-8 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Hôpitaux Nationaux
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Hôpitaux</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {socialData.ravitaillementVital.hospitals.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Avec Énergie</span>
                <span className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {socialData.ravitaillementVital.hospitals.withPower}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Taux de Couverture</span>
                  <span className="font-bold text-success-600 dark:text-success-400">
                    {socialData.ravitaillementVital.hospitals.coveragePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-success-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${socialData.ravitaillementVital.hospitals.coveragePercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-blue-500">
            <div className="flex items-center space-x-3 mb-4">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Zones Scolaires
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Écoles</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {socialData.ravitaillementVital.schools.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Avec Énergie</span>
                <span className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {socialData.ravitaillementVital.schools.withPower}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Taux de Couverture</span>
                  <span className="font-bold text-success-600 dark:text-success-400">
                    {socialData.ravitaillementVital.schools.coveragePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-success-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${socialData.ravitaillementVital.schools.coveragePercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impact sur le Pouvoir d'Achat */}
      {socialData?.pouvoirAchat && (
        <div className="card border-l-4 border-success-500 bg-gradient-to-r from-success-50 to-transparent dark:from-success-900/20">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="w-8 h-8 text-success-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Impact sur le Pouvoir d'Achat
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Économies Cumulées Nationales
              </p>
              <p className="text-3xl font-bold text-success-600 dark:text-success-400">
                {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                  socialData.pouvoirAchat.totalSavingsGNF
                )}{' '}
                GNF
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Familles Bénéficiaires
              </p>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {socialData.pouvoirAchat.familiesBenefiting.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Économie Moyenne par Famille
              </p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                  socialData.pouvoirAchat.avgSavingsPerFamily
                )}{' '}
                GNF
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-success-200 dark:border-success-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {socialData.pouvoirAchat.message}
            </p>
          </div>
        </div>
      )}

      {/* Métriques par Région */}
      {socialData?.metricsByRegion && socialData.metricsByRegion.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Métriques par Région
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Région
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Hôpitaux
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Écoles
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Économies Total
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Familles
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Économie/Famille
                  </th>
                </tr>
              </thead>
              <tbody>
                {socialData.metricsByRegion.map((metric, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {metric.region || 'National'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700 dark:text-gray-300">
                        {metric.hospitals.withPower}/{metric.hospitals.total}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700 dark:text-gray-300">
                        {metric.schools.withPower}/{metric.schools.total}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                          metric.savings.total
                        )}{' '}
                        GNF
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {metric.savings.families.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                          metric.savings.avg
                        )}{' '}
                        GNF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Graphiques */}
      {socialData?.metricsByRegion && socialData.metricsByRegion.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Couverture Hôpitaux par Région
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={socialData.metricsByRegion.map((m) => ({
                  region: m.region || 'National',
                  avec: m.hospitals.withPower,
                  sans: m.hospitals.total - m.hospitals.withPower,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="region" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="avec" fill="#10b981" name="Avec Énergie" stackId="a" />
                <Bar dataKey="sans" fill="#ef4444" name="Sans Énergie" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Économies par Région
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={socialData.metricsByRegion.map((m) => ({
                  region: m.region || 'National',
                  economie: m.savings.total / 1000000, // En millions
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="region" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `${value.toFixed(2)}M GNF`}
                />
                <Legend />
                <Bar dataKey="economie" fill="#0ea5e9" name="Économies (M GNF)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialImpactSection;
