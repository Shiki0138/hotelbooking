import { createTheme, ThemeOptions } from '@mui/material/styles';
import { designTokens } from './design-tokens';

// Extend Material-UI theme interface
declare module '@mui/material/styles' {
  interface Theme {
    customShadows: {
      z1: string;
      z2: string;
      z3: string;
      z4: string;
      z6: string;
      z8: string;
      z12: string;
      z16: string;
      z24: string;
    };
  }
  
  interface ThemeOptions {
    customShadows?: {
      z1: string;
      z2: string;
      z3: string;
      z4: string;
      z6: string;
      z8: string;
      z12: string;
      z16: string;
      z24: string;
    };
  }
  
  interface Palette {
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
  }
  
  interface PaletteOptions {
    neutral?: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
  }
}

// Base theme configuration
const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: designTokens.colors.primary[500],
      light: designTokens.colors.primary[300],
      dark: designTokens.colors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: designTokens.colors.secondary[500],
      light: designTokens.colors.secondary[300],
      dark: designTokens.colors.secondary[700],
      contrastText: '#ffffff',
    },
    error: {
      main: designTokens.colors.semantic.error[500],
      light: designTokens.colors.semantic.error[300],
      dark: designTokens.colors.semantic.error[700],
    },
    warning: {
      main: designTokens.colors.semantic.warning[500],
      light: designTokens.colors.semantic.warning[300],
      dark: designTokens.colors.semantic.warning[700],
    },
    info: {
      main: designTokens.colors.semantic.info[500],
      light: designTokens.colors.semantic.info[300],
      dark: designTokens.colors.semantic.info[700],
    },
    success: {
      main: designTokens.colors.semantic.success[500],
      light: designTokens.colors.semantic.success[300],
      dark: designTokens.colors.semantic.success[700],
    },
    neutral: designTokens.colors.neutral,
    background: {
      default: mode === 'light' 
        ? designTokens.colors.surface.light.primary 
        : designTokens.colors.surface.dark.primary,
      paper: mode === 'light' 
        ? designTokens.colors.surface.light.secondary 
        : designTokens.colors.surface.dark.secondary,
    },
    text: {
      primary: mode === 'light' 
        ? designTokens.colors.neutral[900] 
        : designTokens.colors.neutral[50],
      secondary: mode === 'light' 
        ? designTokens.colors.neutral[600] 
        : designTokens.colors.neutral[300],
      disabled: mode === 'light' 
        ? designTokens.colors.neutral[400] 
        : designTokens.colors.neutral[500],
    },
    divider: mode === 'light' 
      ? designTokens.colors.neutral[200] 
      : designTokens.colors.neutral[700],
  },
  
  typography: {
    fontFamily: designTokens.typography.fontFamily.primary.join(','),
    
    // Display styles
    h1: {
      fontSize: designTokens.typography.fontSize['display-large'].size,
      lineHeight: designTokens.typography.fontSize['display-large'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['display-large'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['display-large'].fontWeight,
    },
    h2: {
      fontSize: designTokens.typography.fontSize['display-medium'].size,
      lineHeight: designTokens.typography.fontSize['display-medium'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['display-medium'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['display-medium'].fontWeight,
    },
    h3: {
      fontSize: designTokens.typography.fontSize['display-small'].size,
      lineHeight: designTokens.typography.fontSize['display-small'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['display-small'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['display-small'].fontWeight,
    },
    h4: {
      fontSize: designTokens.typography.fontSize['headline-large'].size,
      lineHeight: designTokens.typography.fontSize['headline-large'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['headline-large'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['headline-large'].fontWeight,
    },
    h5: {
      fontSize: designTokens.typography.fontSize['headline-medium'].size,
      lineHeight: designTokens.typography.fontSize['headline-medium'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['headline-medium'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['headline-medium'].fontWeight,
    },
    h6: {
      fontSize: designTokens.typography.fontSize['headline-small'].size,
      lineHeight: designTokens.typography.fontSize['headline-small'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['headline-small'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['headline-small'].fontWeight,
    },
    
    // Body text
    body1: {
      fontSize: designTokens.typography.fontSize['body-large'].size,
      lineHeight: designTokens.typography.fontSize['body-large'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['body-large'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['body-large'].fontWeight,
    },
    body2: {
      fontSize: designTokens.typography.fontSize['body-medium'].size,
      lineHeight: designTokens.typography.fontSize['body-medium'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['body-medium'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['body-medium'].fontWeight,
    },
    
    // Captions and labels
    caption: {
      fontSize: designTokens.typography.fontSize['body-small'].size,
      lineHeight: designTokens.typography.fontSize['body-small'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['body-small'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['body-small'].fontWeight,
    },
    button: {
      fontSize: designTokens.typography.fontSize['label-large'].size,
      lineHeight: designTokens.typography.fontSize['label-large'].lineHeight,
      letterSpacing: designTokens.typography.fontSize['label-large'].letterSpacing,
      fontWeight: designTokens.typography.fontSize['label-large'].fontWeight,
      textTransform: 'none' as const,
    },
  },
  
  shape: {
    borderRadius: parseInt(designTokens.borderRadius.md),
  },
  
  spacing: 8, // 8px base spacing
  
  shadows: [
    'none',
    designTokens.shadows.elevation[1],
    designTokens.shadows.elevation[2],
    designTokens.shadows.elevation[3],
    designTokens.shadows.elevation[4],
    designTokens.shadows.elevation[4],
    designTokens.shadows.elevation[6],
    designTokens.shadows.elevation[6],
    designTokens.shadows.elevation[8],
    designTokens.shadows.elevation[8],
    designTokens.shadows.elevation[8],
    designTokens.shadows.elevation[8],
    designTokens.shadows.elevation[12],
    designTokens.shadows.elevation[12],
    designTokens.shadows.elevation[12],
    designTokens.shadows.elevation[12],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[16],
    designTokens.shadows.elevation[24],
  ],
  
  customShadows: {
    z1: designTokens.shadows.elevation[1],
    z2: designTokens.shadows.elevation[2],
    z3: designTokens.shadows.elevation[3],
    z4: designTokens.shadows.elevation[4],
    z6: designTokens.shadows.elevation[6],
    z8: designTokens.shadows.elevation[8],
    z12: designTokens.shadows.elevation[12],
    z16: designTokens.shadows.elevation[16],
    z24: designTokens.shadows.elevation[24],
  },
  
  transitions: {
    duration: {
      shortest: parseInt(designTokens.animation.duration['extra-fast']),
      shorter: parseInt(designTokens.animation.duration.fast),
      short: parseInt(designTokens.animation.duration.normal),
      standard: parseInt(designTokens.animation.duration.normal),
      complex: parseInt(designTokens.animation.duration.slow),
      enteringScreen: parseInt(designTokens.animation.duration.normal),
      leavingScreen: parseInt(designTokens.animation.duration.fast),
    },
    easing: {
      easeInOut: designTokens.animation.easing['ease-in-out'],
      easeOut: designTokens.animation.easing['ease-out'],
      easeIn: designTokens.animation.easing['ease-in'],
      sharp: designTokens.animation.easing.linear,
    },
  },
  
  components: {
    // Global overrides
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${designTokens.colors.neutral[300]} ${designTokens.colors.neutral[100]}`,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: designTokens.colors.neutral[100],
          },
          '&::-webkit-scrollbar-thumb': {
            background: designTokens.colors.neutral[300],
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: designTokens.colors.neutral[400],
          },
        },
      },
    },
    
    // Button component
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.borderRadius.lg,
          textTransform: 'none',
          fontWeight: 500,
          padding: `${designTokens.spacing[3]} ${designTokens.spacing[6]}`,
          minHeight: '44px',
          transition: `all ${designTokens.animation.duration.fast} ${designTokens.animation.easing['ease-in-out']}`,
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: designTokens.shadows.elevation[4],
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          boxShadow: designTokens.shadows.elevation[2],
          '&:hover': {
            boxShadow: designTokens.shadows.elevation[6],
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    
    // Card component
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.borderRadius.xl,
          boxShadow: designTokens.shadows.elevation[2],
          transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing['ease-in-out']}`,
          '&:hover': {
            boxShadow: designTokens.shadows.elevation[8],
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    
    // Paper component
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.borderRadius.lg,
        },
        elevation1: {
          boxShadow: designTokens.shadows.elevation[1],
        },
        elevation2: {
          boxShadow: designTokens.shadows.elevation[2],
        },
        elevation3: {
          boxShadow: designTokens.shadows.elevation[3],
        },
      },
    },
    
    // TextField component
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: designTokens.borderRadius.md,
            transition: `all ${designTokens.animation.duration.fast} ${designTokens.animation.easing['ease-in-out']}`,
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
          },
        },
      },
    },
    
    // Chip component
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.borderRadius.full,
          fontWeight: 500,
        },
      },
    },
    
    // Dialog component
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: designTokens.borderRadius['2xl'],
          boxShadow: designTokens.shadows.elevation[24],
        },
      },
    },
    
    // Menu component
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: designTokens.borderRadius.lg,
          boxShadow: designTokens.shadows.elevation[8],
          marginTop: designTokens.spacing[1],
        },
      },
    },
    
    // Tooltip component
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: designTokens.borderRadius.md,
          fontSize: designTokens.typography.fontSize['body-small'].size,
          fontWeight: 500,
          padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        },
      },
    },
  },
});

// Create light theme
export const lightTheme = createTheme(getThemeOptions('light'));

// Create dark theme
export const darkTheme = createTheme(getThemeOptions('dark'));

// Export theme creator function
export const createAppTheme = (mode: 'light' | 'dark') => 
  createTheme(getThemeOptions(mode));

export default lightTheme;