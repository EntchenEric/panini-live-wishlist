'use client';

import * as React from 'react';
import { createContext, useEffect, useTransition } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const THEME_LOCAL_STORAGE_KEY = 'theme';

const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  storageKey = THEME_LOCAL_STORAGE_KEY,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(systemPrefersDark ? 'dark' : 'light');
    }
  }, [storageKey]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      root.setAttribute('data-theme', theme);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {children}
      <ThemeToggle value={theme} onChange={toggleTheme} />
    </>
  );
};

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

function ThemeToggle({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  const [isPending, startTransition] = useTransition();

  const handleThemeChange = (newTheme: Theme) => {
    startTransition(() => {
      onChange(newTheme);
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => handleThemeChange(value === 'dark' ? 'light' : 'dark')}
      disabled={isPending}
      className="fixed bottom-4 right-4 z-50 h-11 w-11 rounded-full"
    >
      {value === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export { ThemeProvider, ThemeContext };
