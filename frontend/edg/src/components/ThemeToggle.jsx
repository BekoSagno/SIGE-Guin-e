import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 flex items-center justify-center group overflow-hidden"
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      <div className={`absolute transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}>
        <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
      </div>
      <div className={`absolute transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
        <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
      </div>
    </button>
  );
}

export default ThemeToggle;
