// Comprehensive accessibility system for WCAG 2.1 AA compliance
import React, { createContext, useContext, useEffect, useState } from 'react';
import './AccessibilityManager.css';

// Accessibility Context
const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// Main Accessibility Provider
export const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    focusVisible: true,
    announcements: true
  });

  const [focusHistory, setFocusHistory] = useState([]);
  const [announcer, setAnnouncer] = useState(null);

  useEffect(() => {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'accessibility-announcer';
    document.body.appendChild(liveRegion);
    setAnnouncer(liveRegion);

    // Load saved settings
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Detect user preferences
    detectUserPreferences();

    return () => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    };
  }, []);

  useEffect(() => {
    // Apply settings to document
    applyAccessibilitySettings(settings);
    
    // Save settings
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  const detectUserPreferences = () => {
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      largeText: window.matchMedia('(prefers-font-size: large)')
    };

    Object.entries(mediaQueries).forEach(([key, mq]) => {
      if (mq.matches) {
        setSettings(prev => ({ ...prev, [key]: true }));
      }
      
      mq.addEventListener('change', (e) => {
        setSettings(prev => ({ ...prev, [key]: e.matches }));
      });
    });
  };

  const applyAccessibilitySettings = (settings) => {
    const root = document.documentElement;
    
    // High contrast
    root.classList.toggle('high-contrast', settings.highContrast);
    
    // Large text
    root.classList.toggle('large-text', settings.largeText);
    
    // Reduced motion
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    
    // Focus visible
    root.classList.toggle('focus-visible', settings.focusVisible);
  };

  const announce = (message, priority = 'polite') => {
    if (!settings.announcements || !announcer) return;
    
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    announce(`${key} ${value ? 'オン' : 'オフ'}に設定しました`);
  };

  const manageFocus = (element, options = {}) => {
    if (!element) return;
    
    // Store current focus for restoration
    const currentFocus = document.activeElement;
    if (currentFocus && currentFocus !== document.body) {
      setFocusHistory(prev => [...prev.slice(-9), currentFocus]);
    }
    
    // Focus management
    if (options.trap) {
      trapFocus(element);
    }
    
    element.focus();
    
    if (options.announce) {
      announce(options.announce);
    }
  };

  const restoreFocus = () => {
    const lastFocus = focusHistory[focusHistory.length - 1];
    if (lastFocus && document.contains(lastFocus)) {
      lastFocus.focus();
      setFocusHistory(prev => prev.slice(0, -1));
    }
  };

  const trapFocus = (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  const value = {
    settings,
    updateSetting,
    announce,
    manageFocus,
    restoreFocus,
    trapFocus
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Skip Navigation Component
export const SkipNavigation = ({ links = [] }) => {
  const defaultLinks = [
    { href: '#main-content', label: 'メインコンテンツへスキップ' },
    { href: '#navigation', label: 'ナビゲーションへスキップ' },
    { href: '#search', label: '検索へスキップ' },
    { href: '#footer', label: 'フッターへスキップ' }
  ];

  const skipLinks = links.length > 0 ? links : defaultLinks;

  return (
    <nav className="skip-navigation" aria-label="スキップナビゲーション">
      <ul>
        {skipLinks.map((link, index) => (
          <li key={index}>
            <a href={link.href} className="skip-link">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Focus Management Hook
export const useFocusManagement = () => {
  const { manageFocus, restoreFocus, trapFocus } = useAccessibility();
  
  const focusFirstElement = (container) => {
    const firstFocusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    }
  };

  const handleEscapeKey = (callback) => {
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          callback();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [callback]);
  };

  return {
    manageFocus,
    restoreFocus,
    trapFocus,
    focusFirstElement,
    handleEscapeKey
  };
};

// Keyboard Navigation Hook
export const useKeyboardNavigation = (items, options = {}) => {
  const [activeIndex, setActiveIndex] = useState(options.initialIndex || 0);
  const { announce } = useAccessibility();

  const handleKeyDown = (e) => {
    const { vertical = true, horizontal = false, loop = true } = options;
    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (vertical) {
          e.preventDefault();
          newIndex = loop 
            ? (activeIndex + 1) % items.length
            : Math.min(activeIndex + 1, items.length - 1);
        }
        break;
      
      case 'ArrowUp':
        if (vertical) {
          e.preventDefault();
          newIndex = loop
            ? activeIndex === 0 ? items.length - 1 : activeIndex - 1
            : Math.max(activeIndex - 1, 0);
        }
        break;
      
      case 'ArrowRight':
        if (horizontal) {
          e.preventDefault();
          newIndex = loop
            ? (activeIndex + 1) % items.length
            : Math.min(activeIndex + 1, items.length - 1);
        }
        break;
      
      case 'ArrowLeft':
        if (horizontal) {
          e.preventDefault();
          newIndex = loop
            ? activeIndex === 0 ? items.length - 1 : activeIndex - 1
            : Math.max(activeIndex - 1, 0);
        }
        break;
      
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options.onActivate) {
          options.onActivate(items[activeIndex], activeIndex);
        }
        break;
    }

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      if (options.announceSelection && items[newIndex]) {
        announce(`${newIndex + 1}番目の項目: ${items[newIndex].label || items[newIndex]}`);
      }
    }
  };

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown
  };
};

// ARIA Live Announcer Hook
export const useAnnouncer = () => {
  const { announce } = useAccessibility();
  
  const announceSearch = (query, resultCount) => {
    announce(`${query}の検索結果: ${resultCount}件見つかりました`);
  };

  const announceNavigation = (pageName) => {
    announce(`${pageName}ページに移動しました`);
  };

  const announceError = (error) => {
    announce(`エラー: ${error}`, 'assertive');
  };

  const announceSuccess = (message) => {
    announce(`成功: ${message}`);
  };

  const announceLoading = (isLoading, context = '') => {
    if (isLoading) {
      announce(`${context}を読み込み中...`);
    } else {
      announce(`${context}の読み込みが完了しました`);
    }
  };

  return {
    announce,
    announceSearch,
    announceNavigation,
    announceError,
    announceSuccess,
    announceLoading
  };
};

// Accessible Modal Component
export const AccessibleModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  className = '' 
}) => {
  const modalRef = React.useRef(null);
  const { manageFocus, restoreFocus } = useFocusManagement();

  useEffect(() => {
    if (isOpen && modalRef.current) {
      manageFocus(modalRef.current, { 
        trap: true, 
        announce: `モーダル: ${title}が開きました` 
      });
    }
  }, [isOpen, manageFocus, title]);

  const handleClose = () => {
    restoreFocus();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={modalRef}
        className={`accessible-modal ${className}`}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="モーダルを閉じる"
          >
            ×
          </button>
        </div>
        
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

// Accessibility Settings Panel
export const AccessibilitySettings = ({ isOpen, onClose }) => {
  const { settings, updateSetting } = useAccessibility();

  const settingsConfig = [
    {
      key: 'highContrast',
      label: 'ハイコントラスト',
      description: 'テキストと背景のコントラストを強化します'
    },
    {
      key: 'largeText',
      label: '大きな文字',
      description: 'フォントサイズを大きくします'
    },
    {
      key: 'reducedMotion',
      label: 'アニメーション軽減',
      description: 'アニメーションや動きを最小限にします'
    },
    {
      key: 'focusVisible',
      label: 'フォーカス表示',
      description: 'キーボードフォーカスを明確に表示します'
    },
    {
      key: 'announcements',
      label: '音声案内',
      description: 'スクリーンリーダー用の音声案内を有効にします'
    }
  ];

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="アクセシビリティ設定"
      className="accessibility-settings"
    >
      <div className="settings-list">
        {settingsConfig.map((setting) => (
          <div key={setting.key} className="setting-item">
            <div className="setting-info">
              <label htmlFor={setting.key} className="setting-label">
                {setting.label}
              </label>
              <p className="setting-description">{setting.description}</p>
            </div>
            <button
              id={setting.key}
              className={`setting-toggle ${settings[setting.key] ? 'active' : ''}`}
              onClick={() => updateSetting(setting.key, !settings[setting.key])}
              aria-pressed={settings[setting.key]}
              role="switch"
            >
              <span className="toggle-handle"></span>
              <span className="sr-only">
                {settings[setting.key] ? 'オン' : 'オフ'}
              </span>
            </button>
          </div>
        ))}
      </div>
    </AccessibleModal>
  );
};