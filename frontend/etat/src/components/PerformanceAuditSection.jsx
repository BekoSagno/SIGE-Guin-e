import { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, Shield, Award, X } from 'lucide-react';
import { stateService } from '@common/services';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

function PerformanceAuditSection() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await stateService.getPerformanceAudit();
      setAuditData(data);
    } catch (error) {
      console.error('Erreur chargement performance-audit:', error);
      // Données par défaut en cas d'erreur
      setAuditData({
        zoneRanking: [],
        alerts: {
          criticalZones: 0,
          totalZones: 0,
          avgEfficiency: 0,
        },
        transparency: {
          dataCertified: false,
          blockchainEnabled: false,
          logsImmutable: false,
        },
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

  const getEfficiencyColor = (percent) => {
    if (percent >= 80) return '#10b981';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getAlertColor = (level) => {
    if (level === 'CRITICAL') return 'text-red-600 dark:text-red-400';
    if (level === 'WARNING') return 'text-amber-600 dark:text-amber-400';
    return 'text-success-600 dark:text-success-400';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Audit de Performance & Anti-Corruption
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Classement des zones par rendement et détection de mauvaise gestion
        </p>
      </div>

      {/* Alertes Globales */}
      {auditData?.alerts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card border-l-4 border-red-500">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Zones Critiques</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {auditData.alerts.criticalZones}
                </p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-primary-500">
            <div className="flex items-center space-x-3">
              <TrendingDown className="w-6 h-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rendement Moyen</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {auditData.alerts.avgEfficiency.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-success-500">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-success-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Zones Auditées</p>
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {auditData.alerts.totalZones}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transparence des Données */}
      {auditData?.transparency && (
        <div className="card border-l-4 border-primary-500 bg-gray-50 dark:bg-gray-700/30 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="w-6 h-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Transparence des Données
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {auditData.transparency.dataCertified ? (
                <Award className="w-5 h-5 text-success-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Données Certifiées: {auditData.transparency.dataCertified ? 'Oui' : 'Non'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {auditData.transparency.blockchainEnabled ? (
                <Award className="w-5 h-5 text-success-600" />
              ) : (
                <X className="w-5 h-5 text-amber-600" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Blockchain: {auditData.transparency.blockchainEnabled ? 'Activé' : 'À activer'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {auditData.transparency.logsImmutable ? (
                <Award className="w-5 h-5 text-success-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Logs Inaltérables: {auditData.transparency.logsImmutable ? 'Oui' : 'Non'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Classement des Zones */}
      {auditData?.zoneRanking && auditData.zoneRanking.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Classement des Zones par Rendement Financier
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rang
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Zone
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rendement
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Recettes
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Énergie Injectée
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Énergie Recouvrée
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Fraudes
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditData.zoneRanking.map((zone, index) => (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      zone.needsInvestigation ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {index < 3 && (
                          <Award
                            className={`w-5 h-5 ${
                              index === 0
                                ? 'text-amber-500'
                                : index === 1
                                ? 'text-gray-400'
                                : 'text-amber-700'
                            }`}
                          />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {zone.zoneName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className="font-bold"
                        style={{ color: getEfficiencyColor(zone.efficiencyPercent) }}
                      >
                        {zone.efficiencyPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                          zone.revenueCollected
                        )}{' '}
                        GNF
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                          zone.energyInjected
                        )}{' '}
                        kWh
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(
                          zone.energyRecovered
                        )}{' '}
                        kWh
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`badge ${
                          zone.fraudCases > 0 ? 'badge-danger' : 'badge-success'
                        }`}
                      >
                        {zone.fraudCases}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {zone.needsInvestigation ? (
                        <span className="badge badge-danger flex items-center justify-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Enquête</span>
                        </span>
                      ) : (
                        <span
                          className={`badge ${
                            zone.alertLevel === 'CRITICAL'
                              ? 'badge-danger'
                              : zone.alertLevel === 'WARNING'
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                        >
                          {zone.alertLevel || 'NORMAL'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Graphique de Rendement */}
      {auditData?.zoneRanking && auditData.zoneRanking.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Rendement par Zone
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={auditData.zoneRanking.slice(0, 10).map((z) => ({
                zone: z.zoneName,
                rendement: z.efficiencyPercent,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="zone" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
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
              <Bar dataKey="rendement" name="Rendement (%)" radius={[8, 8, 0, 0]}>
                {auditData.zoneRanking.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getEfficiencyColor(entry.efficiencyPercent)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alerte de Mauvaise Gestion */}
      {auditData?.zoneRanking &&
        auditData.zoneRanking.filter((z) => z.needsInvestigation).length > 0 && (
          <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                  Zones Nécessitant une Enquête
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                  Les zones suivantes ont un rendement inférieur à 50% malgré les équipements IoT.
                  Le Ministère peut mandater une enquête sur la gestion locale de l'EDG.
                </p>
                <ul className="space-y-1">
                  {auditData.zoneRanking
                    .filter((z) => z.needsInvestigation)
                    .map((zone, index) => (
                      <li key={index} className="text-sm text-red-700 dark:text-red-400">
                        • {zone.zoneName}: Rendement {zone.efficiencyPercent.toFixed(1)}% •{' '}
                        {zone.fraudCases} cas de fraude détectés
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default PerformanceAuditSection;
