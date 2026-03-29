import { useEffect } from 'react';
import { X } from 'lucide-react';

function cardColorClass(color, isActive) {
  if (isActive) {
    if (color === 'primary') return 'border-primary-400 bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg ring-2 ring-primary-300';
    if (color === 'success') return 'border-success-400 bg-gradient-to-br from-success-500 to-emerald-600 text-white shadow-lg ring-2 ring-success-300';
    if (color === 'accent') return 'border-accent-400 bg-gradient-to-br from-accent-500 to-orange-600 text-white shadow-lg ring-2 ring-accent-300';
  }
  if (color === 'primary') return 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/80 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500';
  if (color === 'success') return 'border-gray-200 bg-white hover:border-success-300 hover:bg-success-50/80 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-success-500';
  if (color === 'accent') return 'border-gray-200 bg-white hover:border-accent-300 hover:bg-accent-50/80 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-accent-500';
  return 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800';
}

/**
 * Fenêtre dédiée : toutes les actions d’un pilier (remplace la liste dans la barre latérale).
 */
function PillarActionsModal({ isOpen, pillar, activeSectionId, onClose, onSelectSection }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !pillar) return null;

  const PillarIcon = pillar.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pillar-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-900 sm:max-h-[85vh] sm:rounded-3xl">
        <div
          className={`flex-shrink-0 rounded-t-3xl bg-gradient-to-r px-5 pb-5 pt-6 text-white sm:rounded-t-3xl ${pillar.tileClass}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <PillarIcon className="h-7 w-7" />
              </div>
              <div>
                <h2 id="pillar-modal-title" className="text-lg font-bold leading-tight">
                  {pillar.title}
                </h2>
                <p className="mt-1 text-sm text-white/90">{pillar.hint}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-xs text-white/85">
            Choisissez une action ci-dessous. Vous pourrez la modifier plus tard avec « Autres actions du thème ».
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <ul className="grid gap-3">
            {pillar.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSectionId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${cardColorClass(item.color, isActive)}`}
                  >
                    <span
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className={`flex-1 text-base font-semibold leading-snug ${isActive ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-white/30 px-2 py-0.5 text-xs font-bold text-white">Ouvert</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PillarActionsModal;
