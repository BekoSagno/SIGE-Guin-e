import { useState } from 'react';
import { Zap, ZapOff, AlertTriangle, Activity, MapPin, Clock, CheckCircle } from 'lucide-react';
import { useNotification, ConfirmDialog } from './Notification';
import { gridService } from '@common/services';

function LoadShedding({ zones, transformers, onRefresh }) {
  const notify = useNotification();
  const [loading, setLoading] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const handleLoadShedding = async (zoneId, action) => {
    setConfirmDialog({
      isOpen: true,
      title: action === 'SHED' ? 'Activer le délestage ?' : 'Rétablir l\'alimentation ?',
      message: action === 'SHED' 
        ? `Cette action va couper les charges lourdes dans la zone ${zoneId}. Les appareils vitaux seront maintenus.`
        : `L'alimentation complète sera rétablie dans la zone ${zoneId}.`,
      type: action === 'SHED' ? 'warning' : 'info',
      confirmText: action === 'SHED' ? 'Activer délestage' : 'Rétablir',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setLoading({ ...loading, [zoneId]: true });
        
        try {
          await gridService.triggerLoadShedding(zoneId, action === 'SHED' ? 'SHED_HEAVY_LOADS' : 'RESTORE_NORMAL');
          notify.grid(
            action === 'SHED' 
              ? `Délestage activé sur ${zoneId}` 
              : `Alimentation rétablie sur ${zoneId}`,
            { 
              title: action === 'SHED' ? '⚡ Délestage actif' : '✅ Alimentation rétablie',
              duration: 5000,
            }
          );
          onRefresh?.();
        } catch (error) {
          notify.error('Erreur lors de l\'opération', {
            title: 'Échec du délestage',
          });
        } finally {
          setLoading({ ...loading, [zoneId]: false });
        }
      },
    });
  };

  const criticalTransformers = transformers.filter(t => t.status === 'CRITICAL');
  const warningTransformers = transformers.filter(t => t.status === 'WARNING');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Délestage Intelligent
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Contrôle chirurgical de la charge réseau via IoT
        </p>
      </div>

      {/* Alertes critiques */}
      {criticalTransformers.length > 0 && (
        <div className="danger-card">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-200">
                {criticalTransformers.length} transformateur(s) en surcharge critique !
              </h3>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                Délestage recommandé immédiatement pour éviter les dommages matériels.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {criticalTransformers.map(t => (
                  <span key={t.transformerId} className="badge-danger">
                    {t.zoneId}: {t.loadPercentage?.toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zones actives</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{zones.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <div className="success-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transformateurs OK</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {transformers.length - criticalTransformers.length - warningTransformers.length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-success-500" />
          </div>
        </div>

        <div className="warning-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En alerte</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {warningTransformers.length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="danger-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critiques</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {criticalTransformers.length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Zones de contrôle */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Contrôle par Zone
        </h3>

        {zones.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune zone configurée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => {
              const transformer = transformers.find(t => t.zoneId === zone.zoneId);
              const status = transformer?.status || 'NORMAL';
              const loadPercent = transformer?.loadPercentage || 0;
              const isLoading = loading[zone.zoneId];

              return (
                <div
                  key={zone.zoneId}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    status === 'CRITICAL' 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : status === 'WARNING'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{zone.zoneId}</h4>
                    <span className={`badge ${
                      status === 'CRITICAL' ? 'badge-danger' :
                      status === 'WARNING' ? 'badge-warning' :
                      'badge-success'
                    }`}>
                      {status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Compteurs</span>
                      <span className="font-semibold">{zone.onlineMeters}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Charge</span>
                      <span className={`font-semibold ${
                        loadPercent > 90 ? 'text-red-600' :
                        loadPercent > 70 ? 'text-amber-600' :
                        'text-success-600'
                      }`}>
                        {loadPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className={`progress-bar-fill ${
                          loadPercent > 90 ? 'progress-danger' :
                          loadPercent > 70 ? 'progress-warning' :
                          'progress-success'
                        }`}
                        style={{ width: `${Math.min(loadPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadShedding(zone.zoneId, 'SHED')}
                      disabled={isLoading || zone.onlineMeters === 0}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-1"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <ZapOff className="w-4 h-4" />
                          <span>Délester</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleLoadShedding(zone.zoneId, 'RESTORE')}
                      disabled={isLoading || zone.onlineMeters === 0}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-lg font-semibold text-sm hover:from-success-600 hover:to-success-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-1"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Rétablir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info délestage intelligent */}
      <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-purple-800 dark:text-purple-200">
              Délestage Intelligent IoT
            </h3>
            <p className="text-purple-600 dark:text-purple-400 text-sm mt-1">
              Le système utilise les kits IoT pour effectuer un délestage chirurgical :
            </p>
            <ul className="text-sm text-purple-600 dark:text-purple-400 mt-2 space-y-1">
              <li>• <strong>Niveau 1 (Vital)</strong> : Éclairage, routeur, ventilateurs - Maintenu</li>
              <li>• <strong>Niveau 2 (Confort)</strong> : TV, chargeurs - Réduit</li>
              <li>• <strong>Niveau 3 (Luxe)</strong> : Climatisation, chauffe-eau - Coupé</li>
            </ul>
          </div>
        </div>
      </div>

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

export default LoadShedding;
