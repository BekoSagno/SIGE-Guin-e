import { useState, useEffect } from 'react';
import { metersService, homesService } from '@common/services';
import { QrCode, Zap, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import QRCodeScanner from './QRCodeScanner';

function MeterPairing({ homeId, onPairingSuccess }) {
  const [showScanner, setShowScanner] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [homes, setHomes] = useState([]);
  const [selectedHomeId, setSelectedHomeId] = useState(homeId);
  const [scannedData, setScannedData] = useState(null);

  useEffect(() => {
    loadHomes();
  }, []);

  useEffect(() => {
    if (homeId) {
      setSelectedHomeId(homeId);
    }
  }, [homeId]);

  const loadHomes = async () => {
    try {
      const data = await homesService.getHomes();
      setHomes(data.homes || []);
      if (homeId) {
        setSelectedHomeId(homeId);
      } else if (data.homes && data.homes.length > 0) {
        setSelectedHomeId(data.homes[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement foyers:', error);
    }
  };

  const handleQRScan = (decodedText) => {
    setScannedData(decodedText);
    setShowScanner(false);
    
    // Parser le QR Code : format "meterId|pairingKey"
    const parts = decodedText.split('|');
    if (parts.length !== 2) {
      setError('Format QR Code invalide. Attendu : meterId|pairingKey');
      return;
    }

    const [meterId, pairingKey] = parts;
    handlePairing(meterId.trim(), pairingKey.trim());
  };

  const handlePairing = async (meterId, pairingKey) => {
    if (!selectedHomeId) {
      setError('Veuillez sélectionner un foyer');
      return;
    }

    setPairing(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await metersService.pairMeter(meterId, selectedHomeId, pairingKey);
      setSuccess(true);
      
      if (onPairingSuccess) {
        onPairingSuccess(result.meter);
      }

      // Réinitialiser après 3 secondes
      setTimeout(() => {
        setSuccess(false);
        setScannedData(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'appairage');
    } finally {
      setPairing(false);
    }
  };

  const handleManualPairing = () => {
    const meterId = prompt('Entrez l\'ID du kit IoT (UUID):');
    const pairingKey = prompt('Entrez la clé d\'appairage:');

    if (meterId && pairingKey) {
      handlePairing(meterId.trim(), pairingKey.trim());
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30 rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-success-600 dark:text-success-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Appairage Kit IoT</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Connectez votre compteur intelligent</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 rounded-xl animate-slide-down">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-5 p-4 bg-gradient-to-r from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-800/20 border-l-4 border-success-500 rounded-xl animate-scale-in">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-success-700 dark:text-success-300">
                Kit IoT appairé avec succès !
              </p>
              <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                Votre compteur est maintenant connecté et opérationnel
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Foyer de connexion
          </label>
          <select
            value={selectedHomeId || ''}
            onChange={(e) => setSelectedHomeId(e.target.value)}
            disabled={pairing}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:border-success-500 focus:ring-2 focus:ring-success-200 dark:focus:ring-success-900 transition-all font-medium disabled:opacity-50"
          >
            <option value="">Sélectionner un foyer</option>
            {homes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.nom} ({home.ville})
              </option>
            ))}
          </select>
        </div>

        {scannedData && (
          <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border-2 border-primary-200 dark:border-primary-800 animate-scale-in">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Données scannées :</p>
            <p className="text-sm font-mono text-primary-900 dark:text-primary-100 break-all bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
              {scannedData}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowScanner(true)}
            disabled={pairing || !selectedHomeId}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {pairing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Appairage en cours...</span>
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                <span>Scanner QR Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleManualPairing}
            disabled={pairing || !selectedHomeId}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Saisie manuelle
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-lg">
          <p className="font-semibold mb-1">📋 Instructions :</p>
          <p className="mb-2">Le QR Code du kit IoT contient l'ID du compteur et la clé d'appairage.</p>
          <p>Format : <code className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded font-mono font-semibold">meterId|pairingKey</code></p>
        </div>
      </div>

      {showScanner && (
        <QRCodeScanner
          onScanSuccess={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

export default MeterPairing;
