// Design Tokens - World-class Design System
// Following Material Design 3 and modern design principles

export const designTokens = {
  // Color System
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#fef7ee',
      100: '#fdedd3',
      200: '#fad7a5',
      300: '#f6bb6d',
      400: '#f19533',
      500: '#ed7611', // Main brand color
      600: '#de5c07',
      700: '#b84408',
      800: '#93370e',
      900: '#762f0f',
      950: '#40160b',
    },
    
    // Secondary Colors
    secondary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Main secondary color
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    
    // Semantic Colors
    semantic: {
      success: {
        50: '#f0fdf4',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
      },
      error: {
        50: '#fef2f2',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
      },
      warning: {
        50: '#fefce8',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
      },
      info: {
        50: '#f0f9ff',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      },
    },
    
    // Neutral Colors
    neutral: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
      1000: '#000000',
    },
    
    // Surface Colors
    surface: {
      light: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        tertiary: '#f1f5f9',
        inverse: '#1e293b',
      },
      dark: {
        primary: '#0f172a',
        secondary: '#1e293b',
        tertiary: '#334155',
        inverse: '#f8fafc',
      },
    },
  },
  
  // Typography System
  typography: {
    fontFamily: {
      primary: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
    },
    
    fontSize: {
      'display-large': {
        size: '57px',
        lineHeight: '64px',
        letterSpacing: '-0.25px',
        fontWeight: '400',
      },
      'display-medium': {
        size: '45px',
        lineHeight: '52px',
        letterSpacing: '0px',
        fontWeight: '400',
      },
      'display-small': {
        size: '36px',
        lineHeight: '44px',
        letterSpacing: '0px',
        fontWeight: '400',
      },
      'headline-large': {
        size: '32px',
        lineHeight: '40px',
        letterSpacing: '0px',
        fontWeight: '400',
      },
      'headline-medium': {
        size: '28px',
        lineHeight: '36px',
        letterSpacing: '0px',
        fontWeight: '400',
      },
      'headline-small': {
        size: '24px',
        lineHeight: '32px',
        letterSpacing: '0px',
        fontWeight: '400',
      },
      'title-large': {
        size: '22px',
        lineHeight: '28px',
        letterSpacing: '0px',
        fontWeight: '400',
      },
      'title-medium': {
        size: '16px',
        lineHeight: '24px',
        letterSpacing: '0.15px',
        fontWeight: '500',
      },
      'title-small': {
        size: '14px',
        lineHeight: '20px',
        letterSpacing: '0.1px',
        fontWeight: '500',
      },
      'body-large': {
        size: '16px',
        lineHeight: '24px',
        letterSpacing: '0.5px',
        fontWeight: '400',
      },
      'body-medium': {
        size: '14px',
        lineHeight: '20px',
        letterSpacing: '0.25px',
        fontWeight: '400',
      },
      'body-small': {
        size: '12px',
        lineHeight: '16px',
        letterSpacing: '0.4px',
        fontWeight: '400',
      },
      'label-large': {
        size: '14px',
        lineHeight: '20px',
        letterSpacing: '0.1px',
        fontWeight: '500',
      },
      'label-medium': {
        size: '12px',
        lineHeight: '16px',
        letterSpacing: '0.5px',
        fontWeight: '500',
      },
      'label-small': {
        size: '11px',
        lineHeight: '16px',
        letterSpacing: '0.5px',
        fontWeight: '500',
      },
    },
  },
  
  // Spacing System (8px base)
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px',
  },
  
  // Border Radius
  borderRadius: {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },
  
  // Shadows & Elevation
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    
    // Material Design elevation levels
    elevation: {
      0: 'none',
      1: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
      2: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
      3: '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
      4: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
      6: '0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)',
      8: '0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)',
      12: '0px 7px 8px -4px rgba(0,0,0,0.2), 0px 12px 17px 2px rgba(0,0,0,0.14), 0px 5px 22px 4px rgba(0,0,0,0.12)',
      16: '0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12)',
      24: '0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)',
    },
  },
  
  // Animation & Motion
  animation: {
    duration: {
      'extra-fast': '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      'extra-slow': '700ms',
    },
    
    easing: {
      linear: 'linear',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      'ease-in-back': 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
      'ease-out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'ease-in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    
    // Motion tokens
    motion: {
      'fade-in': {
        keyframes: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        duration: '200ms',
        easing: 'ease-out',
      },
      'scale-in': {
        keyframes: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        duration: '200ms',
        easing: 'ease-out',
      },
      'slide-in-up': {
        keyframes: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        duration: '300ms',
        easing: 'ease-out',
      },
    },
  },
  
  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px',
  },
  
  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
} as const;

// Export individual token categories for easier imports
export const colors = designTokens.colors;
export const typography = designTokens.typography;
export const spacing = designTokens.spacing;
export const shadows = designTokens.shadows;
export const animation = designTokens.animation;
export const breakpoints = designTokens.breakpoints;

export default designTokens;