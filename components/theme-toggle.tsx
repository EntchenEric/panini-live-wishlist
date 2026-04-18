'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  onThemeChange?: (theme: Theme) => void;
  defaultTheme?: Theme;
}

export function ThemeToggle({
  onThemeChange,
  defaultTheme = 'system',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isDark, setIsDark] = useState(false);

  // Get system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update DOM class when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      root.classList.add(isDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }

    onThemeChange?.(theme);
  }, [theme, isDark, onThemeChange]);

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(isDark ? 'light' : 'dark');
    } else {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-5 w-5" />;
    }
    return isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    return isDark ? 'Dark' : 'Light';
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="transition-all duration-300"
      aria-label={`Switch to ${getLabel()} theme`}
    >
      {getIcon()}
    </Button>
  );
}

export default ThemeToggle;
