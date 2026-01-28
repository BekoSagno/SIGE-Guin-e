import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, X, CheckCircle } from 'lucide-react';

function QRCodeScanner({ onScanSuccess, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    if (scanning && !html5QrcodeScannerRef.current) {
      // Créer le scanner
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 10,
          aspectRatio: 1.0,
        },
        false // verbose
      );

      html5QrcodeScannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          // QR Code scanné avec succès
          setResult(decodedText);
          setScanning(false);
          
          // Arrêter le scanner
          scanner.clear().then(() => {
            html5QrcodeScannerRef.current = null;
          }).catch((err) => {
            console.error('Erreur arrêt scanner:', err);
          });

          // Appeler le callback
          if (onScanSuccess) {
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Erreur ignorée (scan en cours)
        }
      );
    }

    return () => {
      // Nettoyer le scanner lors du démontage
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch((err) => {
          console.error('Erreur nettoyage scanner:', err);
        });
        html5QrcodeScannerRef.current = null;
      }
    };
  }, [scanning, onScanSuccess]);

  const startScan = () => {
    setScanning(true);
    setResult(null);
  };

  const stopScan = () => {
    setScanning(false);
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().catch((err) => {
        console.error('Erreur arrêt scanner:', err);
      });
      html5QrcodeScannerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Scanner QR Code
            </h3>
          </div>
          <button
            onClick={onClose || stopScan}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!scanning && !result && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Scannez le QR Code du kit IoT pour l'appairer
            </p>
            <button onClick={startScan} className="btn-primary">
              Démarrer le scan
            </button>
          </div>
        )}

        {scanning && (
          <div>
            <div id="qr-reader" className="mb-4"></div>
            <button onClick={stopScan} className="w-full btn-secondary">
              Arrêter le scan
            </button>
          </div>
        )}

        {result && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">QR Code scanné :</p>
            <p className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
              {result}
            </p>
            <button
              onClick={() => {
                setResult(null);
                startScan();
              }}
              className="mt-4 btn-primary"
            >
              Scanner à nouveau
            </button>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p>Le QR Code doit contenir : meterId|pairingKey</p>
        </div>
      </div>
    </div>
  );
}

export default QRCodeScanner;
