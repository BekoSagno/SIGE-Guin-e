import { useState } from 'react';
import { FileText, Download, Calendar, Filter } from 'lucide-react';

function ReportsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Rapports disponibles (simulés)
  const reports = [
    {
      id: 1,
      title: 'Rapport Mensuel de Performance',
      type: 'Mensuel',
      period: 'Janvier 2025',
      generatedAt: '2025-01-20',
      size: '2.4 MB',
      format: 'PDF',
    },
    {
      id: 2,
      title: 'Analyse Financière Trimestrielle',
      type: 'Trimestriel',
      period: 'Q4 2024',
      generatedAt: '2025-01-15',
      size: '5.1 MB',
      format: 'PDF',
    },
    {
      id: 3,
      title: 'Rapport Annuel de Souveraineté Énergétique',
      type: 'Annuel',
      period: '2024',
      generatedAt: '2025-01-10',
      size: '12.8 MB',
      format: 'PDF',
    },
    {
      id: 4,
      title: 'Analyse Gap Financier',
      type: 'Spécialisé',
      period: 'Décembre 2024',
      generatedAt: '2025-01-05',
      size: '1.9 MB',
      format: 'PDF',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Rapports Ministériels
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Génération et consultation des rapports stratégiques
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les rapports</option>
            <option value="month">Mensuels</option>
            <option value="quarter">Trimestriels</option>
            <option value="year">Annuels</option>
            <option value="special">Spécialisés</option>
          </select>
          <button className="btn-primary">
            <FileText className="w-5 h-5" />
            <span>Générer un rapport</span>
          </button>
        </div>
      </div>

      {/* Liste des rapports */}
      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="card border-l-4 border-primary-500 hover:shadow-xl transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                      {report.title}
                    </h3>
                    <span className="badge badge-primary">{report.type}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{report.period}</span>
                    </span>
                    <span>Généré le: {new Date(report.generatedAt).toLocaleDateString('fr-FR')}</span>
                    <span>{report.size}</span>
                    <span className="badge badge-info">{report.format}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary">
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Types de rapports disponibles */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Types de Rapports Disponibles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Rapports Réguliers
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Rapport Mensuel de Performance</li>
              <li>• Rapport Trimestriel Financier</li>
              <li>• Rapport Annuel de Souveraineté</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Rapports Spécialisés
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Analyse Gap Financier</li>
              <li>• Évaluation Impact Social</li>
              <li>• Planification Hydroélectrique</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsSection;
