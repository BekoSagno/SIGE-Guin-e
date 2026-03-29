import { Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CITIZEN_PILLARS, getPillarIdForSection } from '../config/citizenNav.jsx';

/**
 * Affiche uniquement les 4 piliers. Le détail des actions s’ouvre dans une modale (Dashboard).
 */
function DashboardSidebar({ activeSection, onOpenPillarMenu }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePillarId = useMemo(() => getPillarIdForSection(activeSection), [activeSection]);

  const openMenuForPillar = (pillarId) => {
    onOpenPillarMenu(pillarId);
    setMobileMenuOpen(false);
  };

  const PillarTiles = ({ columns = 'grid-cols-2' }) => (
    <div className={`grid ${columns} gap-2.5`}>
      {CITIZEN_PILLARS.map((p) => {
        const Icon = p.icon;
        const isSelected = activePillarId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => openMenuForPillar(p.id)}
            className={`relative flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-all duration-200 ${
              isSelected
                ? `bg-white dark:bg-gray-800 shadow-lg ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900 ${p.ringActive}`
                : 'border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div
              className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${p.tileClass}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold leading-tight text-gray-900 dark:text-gray-100">{p.shortTitle}</span>
            <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-gray-500 dark:text-gray-400">{p.hint}</span>
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-primary-500 shadow-sm dark:bg-primary-400" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-2xl transition-transform hover:scale-110"
        aria-label="Ouvrir les 4 thèmes"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            className="absolute right-0 top-0 flex h-full w-[min(100%,22rem)] flex-col bg-white shadow-2xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Les 4 thèmes"
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Les 4 piliers</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ouvrir le menu des actions du thème</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PillarTiles />
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block lg:hidden">
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-1 py-2 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/95"
          aria-label="Les 4 thèmes"
        >
          <div className="mx-auto flex max-w-lg justify-between gap-1 px-2">
            {CITIZEN_PILLARS.map((p) => {
              const Icon = p.icon;
              const isActive = activePillarId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openMenuForPillar(p.id)}
                  className={`flex min-w-0 flex-1 flex-col items-center rounded-xl py-2 transition-colors ${
                    isActive ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="mt-0.5 max-w-full truncate px-0.5 text-[9px] font-bold leading-none">{p.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="relative hidden flex-shrink-0 lg:block">
        <nav
          id="dashboard-sidebar"
          className="sticky top-20 w-[17.5rem] xl:w-[19rem]"
          aria-label="Navigation principale"
        >
          <div className="rounded-2xl border-2 border-primary-200 bg-white/90 p-4 shadow-xl backdrop-blur-lg dark:border-primary-900 dark:bg-gray-800/90">
            <h2 className="px-1 text-base font-bold text-gray-900 dark:text-gray-100">Les 4 piliers</h2>
            <p className="mb-4 px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Cliquez sur un pilier : les actions de ce thème s’affichent dans une fenêtre dédiée, pas dans la marge.
            </p>
            <PillarTiles />
          </div>
        </nav>
      </div>
    </>
  );
}

export default DashboardSidebar;
