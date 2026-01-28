import { useState, useEffect } from 'react';
import { AlertTriangle, Zap, TrendingDown, Activity, Shield } from 'lucide-react';
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
  Cell,
} from 'recharts';

function MaintenancePredictiveSection() {
  const [loading, setLoading] = useState(true);
  const [maintenanceData, setMaintenanceData] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000); // Rafraîchir toutes les 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getMaintenancePredictive();
      setMaintenanceData(data);
    } catch (error) {
      console.error('Erreur chargement maintenance-predictive:', error);
      // Données par défaut en cas d'erreur
      setMaintenanceData({
        networkLines: [],
        riskAnalysis: {
          criticalLines: 0,
          totalLines: 0,
          totalEstimatedCost: 0,
          avgFailureProbability: 0,
        },
        blackoutAlerts: [],
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

  const getRiskColor = (risk) => {
    if (risk === 'CRITICAL') return '#ef4444';
    if (risk === 'HIGH') return '#f59e0b';
    if (risk === 'MEDIUM') return '#eab308';
    return '#10b981';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'NATIONAL_PRIORITY') return '#ef4444';
    if (priority === 'URGENT') return '#f59e0b';
    if (priority === 'HIGH') return '#eab308';
    return '#6b7280';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Maintenance Prédictive Nationale (Réseau HT)
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Surveillance des actifs stratégiques de transport et protection contre les black-outs
        </p>
      </div>

      {/* Analyse des Risques */}
      {maintenanceData?.riskAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card border-l-4 border-primary-500 hover:shadow-xl transition-all duration-300 animate-fade-in-scale">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lignes Critiques</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {maintenanceData.riskAnalysis.criticalLines}
                </p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-gray-400 hover:shadow-xl transition-all duration-300 animate-fade-in-scale" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center space-x-3">
              <Zap className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Lignes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {maintenanceData.riskAnalysis.totalLines}
                </p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-gray-400 hover:shadow-xl transition-all duration-300 animate-fade-in-scale" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center space-x-3">
              <TrendingDown className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Risque Moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {maintenanceData.riskAnalysis.avgFailureProbability.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-success-500 hover:shadow-xl transition-all duration-300 animate-fade-in-scale" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-success-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Coût Estimé</p>
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                    maintenanceData.riskAnalysis.totalEstimatedCost
                  )}{' '}
                  GNF
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertes de Black-out National */}
      {maintenanceData?.blackoutAlerts && maintenanceData.blackoutAlerts.length > 0 && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-300">
              Alertes de Black-out National
            </h3>
          </div>
          <div className="space-y-4">
            {maintenanceData.blackoutAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-l-4 ${
                  alert.level === 'IMMINENT'
                    ? 'bg-red-100 dark:bg-red-900/30 border-red-600'
                    : alert.level === 'CRITICAL'
                    ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-600'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`badge ${
                          alert.level === 'IMMINENT'
                            ? 'badge-danger'
                            : alert.level === 'CRITICAL'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {alert.level}
                      </span>
                      {alert.fundsApproved && (
                        <span className="badge badge-success">Fonds Approuvés</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>Lignes affectées:</strong>{' '}
                      {alert.affectedLines.length > 0
                        ? alert.affectedLines.join(', ')
                        : 'Non spécifié'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>Impact:</strong> {alert.impactPopulation.toLocaleString()} personnes •{' '}
                      {alert.impactRegions.length} régions
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>Durée estimée:</strong> {alert.estimatedDuration.toFixed(1)} heures
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>Fonds d'urgence requis:</strong>{' '}
                      {new Intl.NumberFormat('fr-FR').format(alert.fundsRequired)} GNF
                    </p>
                    {alert.mitigationActions && (
                      <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          Actions d'Atténuation:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {alert.mitigationActions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lignes du Réseau HT */}
      {maintenanceData?.networkLines && maintenanceData.networkLines.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            État des Lignes Haute Tension
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ligne
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Région
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Tension
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Chute Tension
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Risque
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Probabilité
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Priorité
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Coût Est.
                  </th>
                </tr>
              </thead>
              <tbody>
                {maintenanceData.networkLines.map((line, index) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      line.priority === 'NATIONAL_PRIORITY' ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {line.lineName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700 dark:text-gray-300">{line.region}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700 dark:text-gray-300">
                        {line.voltageLevel} kV
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-semibold ${
                          line.voltageDrop > 10
                            ? 'text-red-600'
                            : line.voltageDrop > 5
                            ? 'text-amber-600'
                            : 'text-success-600'
                        }`}
                      >
                        {line.voltageDrop.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getRiskColor(line.failureRisk) + '20',
                          color: getRiskColor(line.failureRisk),
                          borderColor: getRiskColor(line.failureRisk),
                        }}
                      >
                        {line.failureRisk}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700 dark:text-gray-300">
                        {line.failureProbability.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getPriorityColor(line.priority) + '20',
                          color: getPriorityColor(line.priority),
                          borderColor: getPriorityColor(line.priority),
                        }}
                      >
                        {line.priority === 'NATIONAL_PRIORITY'
                          ? 'Priorité Nationale'
                          : line.priority === 'URGENT'
                          ? 'Urgent'
                          : line.priority === 'HIGH'
                          ? 'Élevée'
                          : 'Normale'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                          line.estimatedCost
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
      {maintenanceData?.networkLines && maintenanceData.networkLines.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Risque de Défaillance par Ligne
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={maintenanceData.networkLines
                  .slice(0, 10)
                  .map((l) => ({
                    ligne: l.lineName.substring(0, 15),
                    risque: l.failureProbability,
                  }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ligne" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="risque" name="Probabilité de Défaillance (%)" radius={[8, 8, 0, 0]}>
                  {maintenanceData.networkLines.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRiskColor(entry.failureRisk)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Chute de Tension vs Risque
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={maintenanceData.networkLines
                  .slice(0, 10)
                  .map((l) => ({
                    ligne: l.lineName.substring(0, 10),
                    chute: l.voltageDrop,
                    risque: l.failureProbability,
                  }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ligne" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="chute"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Chute Tension (%)"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="risque"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Risque (%)"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Workflow d'Urgence */}
      {maintenanceData?.riskAnalysis &&
        maintenanceData.riskAnalysis.criticalLines > 0 && (
          <div className="card bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <Activity className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Workflow d'Urgence Activé
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                  En cas de risque de black-out national (effondrement du réseau), le Ministère
                  reçoit une alerte de "Priorité Nationale" pour débloquer les fonds de maintenance
                  d'urgence.
                </p>
                <div className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                  <p>
                    • {maintenanceData.riskAnalysis.criticalLines} ligne(s) critique(s) nécessitant
                    une intervention immédiate
                  </p>
                  <p>
                    • Coût total estimé:{' '}
                    {new Intl.NumberFormat('fr-FR').format(
                      maintenanceData.riskAnalysis.totalEstimatedCost
                    )}{' '}
                    GNF
                  </p>
                  <p>
                    • Risque moyen de défaillance:{' '}
                    {maintenanceData.riskAnalysis.avgFailureProbability.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default MaintenancePredictiveSection;
