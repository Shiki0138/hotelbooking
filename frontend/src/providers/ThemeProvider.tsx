import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme, lightTheme, darkTheme } from '../theme/mui-theme';
import { designTokens } from '../theme/design-tokens';

// Theme context
interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark') => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Local storage key
const THEME_STORAGE_KEY = 'lastminutestay-theme-mode';

// System preference detection
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Get initial theme from storage or system preference
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null;
  
  if (storedTheme) {
    return storedTheme;
  }
  
  return getSystemTheme();
};

// Custom CSS variables for theme
const injectCSSVariables = (mode: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  const tokens = designTokens;
  
  // Color variables
  const colors = mode === 'light' ? tokens.colors : tokens.colors;
  
  // Inject CSS custom properties
  root.style.setProperty('--color-primary-50', colors.primary[50]);
  root.style.setProperty('--color-primary-100', colors.primary[100]);
  root.style.setProperty('--color-primary-200', colors.primary[200]);
  root.style.setProperty('--color-primary-300', colors.primary[300]);
  root.style.setProperty('--color-primary-400', colors.primary[400]);
  root.style.setProperty('--color-primary-500', colors.primary[500]);
  root.style.setProperty('--color-primary-600', colors.primary[600]);
  root.style.setProperty('--color-primary-700', colors.primary[700]);
  root.style.setProperty('--color-primary-800', colors.primary[800]);
  root.style.setProperty('--color-primary-900', colors.primary[900]);
  
  root.style.setProperty('--color-secondary-50', colors.secondary[50]);
  root.style.setProperty('--color-secondary-500', colors.secondary[500]);
  root.style.setProperty('--color-secondary-600', colors.secondary[600]);
  root.style.setProperty('--color-secondary-700', colors.secondary[700]);
  
  // Neutral colors
  root.style.setProperty('--color-neutral-0', colors.neutral[0]);
  root.style.setProperty('--color-neutral-50', colors.neutral[50]);
  root.style.setProperty('--color-neutral-100', colors.neutral[100]);
  root.style.setProperty('--color-neutral-200', colors.neutral[200]);
  root.style.setProperty('--color-neutral-300', colors.neutral[300]);
  root.style.setProperty('--color-neutral-400', colors.neutral[400]);
  root.style.setProperty('--color-neutral-500', colors.neutral[500]);
  root.style.setProperty('--color-neutral-600', colors.neutral[600]);
  root.style.setProperty('--color-neutral-700', colors.neutral[700]);
  root.style.setProperty('--color-neutral-800', colors.neutral[800]);
  root.style.setProperty('--color-neutral-900', colors.neutral[900]);
  root.style.setProperty('--color-neutral-950', colors.neutral[950]);
  root.style.setProperty('--color-neutral-1000', colors.neutral[1000]);
  
  // Surface colors based on mode
  const surface = mode === 'light' ? colors.surface.light : colors.surface.dark;
  root.style.setProperty('--color-surface-primary', surface.primary);
  root.style.setProperty('--color-surface-secondary', surface.secondary);
  root.style.setProperty('--color-surface-tertiary', surface.tertiary);
  root.style.setProperty('--color-surface-inverse', surface.inverse);
  
  // Semantic colors
  root.style.setProperty('--color-success-50', colors.semantic.success[50]);
  root.style.setProperty('--color-success-500', colors.semantic.success[500]);
  root.style.setProperty('--color-success-600', colors.semantic.success[600]);
  root.style.setProperty('--color-success-700', colors.semantic.success[700]);
  
  root.style.setProperty('--color-error-50', colors.semantic.error[50]);
  root.style.setProperty('--color-error-500', colors.semantic.error[500]);
  root.style.setProperty('--color-error-600', colors.semantic.error[600]);
  root.style.setProperty('--color-error-700', colors.semantic.error[700]);
  
  root.style.setProperty('--color-warning-50', colors.semantic.warning[50]);
  root.style.setProperty('--color-warning-500', colors.semantic.warning[500]);
  root.style.setProperty('--color-warning-600', colors.semantic.warning[600]);
  root.style.setProperty('--color-warning-700', colors.semantic.warning[700]);
  
  root.style.setProperty('--color-info-50', colors.semantic.info[50]);
  root.style.setProperty('--color-info-500', colors.semantic.info[500]);
  root.style.setProperty('--color-info-600', colors.semantic.info[600]);
  root.style.setProperty('--color-info-700', colors.semantic.info[700]);
  
  // Spacing variables
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Border radius variables
  Object.entries(tokens.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--border-radius-${key}`, value);
  });
  
  // Shadow variables
  Object.entries(tokens.shadows.elevation).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-elevation-${key}`, value);
  });
  
  // Animation variables
  Object.entries(tokens.animation.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });
  
  Object.entries(tokens.animation.easing).forEach(([key, value]) => {
    root.style.setProperty(`--easing-${key}`, value);
  });
};

// Provider component
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: 'light' | 'dark';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultMode 
}) => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return defaultMode || getInitialTheme();
  });

  // Update CSS variables when mode changes
  useEffect(() => {
    injectCSSVariables(mode);
    
    // Update document class for Tailwind dark mode
    if (typeof document !== 'undefined') {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [mode]);

  // Save theme preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!storedTheme) {
        setMode(event.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((newMode: 'light' | 'dark') => {
    setMode(newMode);
  }, []);

  const contextValue: ThemeContextType = {
    mode,
    toggleTheme,
    setTheme,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Theme toggle component
interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'medium',
  showLabel = false,
  className
}) => {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${className || ''}`}
      aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing[2],
        padding: designTokens.spacing[2],
        background: 'transparent',
        border: 'none',
        borderRadius: designTokens.borderRadius.md,
        cursor: 'pointer',
        transition: `all ${designTokens.animation.duration.fast} ${designTokens.animation.easing['ease-in-out']}`,
        fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
      }}
    >
      <span style={{ fontSize: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px' }}>
        {mode === 'light' ? '🌙' : '☀️'}
      </span>
      {showLabel && (
        <span>
          {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeProvider;