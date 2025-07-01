import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import './ThemeToggle.css';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  variant?: 'default' | 'switch' | 'floating';
  className?: string;
  position?: 'relative' | 'fixed';
  showTooltip?: boolean;
  ariaLabel?: string;
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'medium',
  showLabel = false,
  variant = 'default',
  className = '',
  position = 'relative',
  showTooltip = true,
  ariaLabel,
  onThemeChange
}) => {
  const { mode, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useRef(`theme-toggle-tooltip-${Math.random().toString(36).substr(2, 9)}`).current;

  // Handle theme toggle with loading state
  const handleToggle = async () => {
    setIsLoading(true);
    setIsAnimating(true);
    
    try {
      await toggleTheme();
      if (onThemeChange) {
        onThemeChange(mode === 'light' ? 'dark' : 'light');
      }
      
      // Announce change to screen readers
      const announcement = `Theme changed to ${mode === 'light' ? 'dark' : 'light'} mode`;
      announceToScreenReader(announcement);
      
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement === buttonRef.current) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [mode]);

  // Announce to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const getButtonClasses = () => {
    const classes = [
      'theme-toggle',
      `theme-toggle--${size}`,
      variant !== 'default' && `theme-toggle--${variant}`,
      isLoading && 'theme-toggle--loading',
      isAnimating && 'theme-toggle--animating',
      position === 'fixed' && 'theme-toggle--floating',
      className
    ];
    return classes.filter(Boolean).join(' ');
  };

  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel;
    const currentMode = mode === 'light' ? 'light' : 'dark';
    const nextMode = mode === 'light' ? 'dark' : 'light';
    return `Current theme: ${currentMode}. Click to switch to ${nextMode} mode`;
  };

  const renderIcon = () => {
    if (variant === 'switch') {
      return (
        <span className="theme-toggle-icon">
          <span className="theme-toggle-icon--sun">☀️</span>
          <span className="theme-toggle-icon--moon">🌙</span>
        </span>
      );
    }

    return (
      <span className="theme-toggle-icon" role="img" aria-hidden="true">
        {mode === 'light' ? '🌙' : '☀️'}
      </span>
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={getButtonClasses()}
        aria-label={getAriaLabel()}
        aria-pressed={mode === 'dark'}
        aria-describedby={showTooltip ? tooltipId : undefined}
        disabled={isLoading}
        type="button"
        role="switch"
      >
        {renderIcon()}
        {showLabel && (
          <span className="theme-toggle-label">
            {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        )}
        {showTooltip && (
          <span
            id={tooltipId}
            className="theme-toggle-tooltip"
            role="tooltip"
            aria-hidden="true"
          >
            {mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          </span>
        )}
      </button>

      {/* Screen reader only announcement area */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        <span id="theme-status">
          Current theme: {mode} mode
        </span>
      </div>

      <style jsx>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </>
  );
};

// Additional hook for theme detection
export const useSystemThemePreference = () => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
};

export default ThemeToggle;