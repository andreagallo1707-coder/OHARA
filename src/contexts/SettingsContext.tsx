import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'Crimson' | 'Emerald' | 'Indigo' | 'Amber';

interface SettingsContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  autoSave: boolean;
  setAutoSave: (autoSave: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeColor>(() => {
    return (localStorage.getItem('ohara_theme') as ThemeColor) || 'Crimson';
  });
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    const saved = localStorage.getItem('ohara_autosave');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('ohara_theme', theme);
    // Apply theme to document root
    const root = document.documentElement;
    const colors: Record<ThemeColor, string> = {
      Crimson: '#dc143c',
      Emerald: '#10b981',
      Indigo: '#6366f1',
      Amber: '#f59e0b'
    };
    const darkColors: Record<ThemeColor, string> = {
      Crimson: '#8b0000',
      Emerald: '#064e3b',
      Indigo: '#312e81',
      Amber: '#78350f'
    };
    root.style.setProperty('--color-ohara-red-vivid', colors[theme]);
    root.style.setProperty('--color-ohara-red-dark', darkColors[theme]);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ohara_autosave', JSON.stringify(autoSave));
  }, [autoSave]);

  return (
    <SettingsContext.Provider value={{ theme, setTheme, autoSave, setAutoSave }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
