import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full card border-l-4 border-red-500">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Erreur de Rendu
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Une erreur s'est produite lors du chargement de cette section.
            </p>
            <details className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <summary className="cursor-pointer mb-2">Détails de l'erreur</summary>
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary w-full"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
