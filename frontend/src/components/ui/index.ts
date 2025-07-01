// Design System Components Export
// World-class UI components for LastMinuteStay

// Core Components
export { default as Button } from './Button/Button';
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonColor } from './Button/Button';

export { default as Card, CardContent, CardActions, CardHeader } from './Card/Card';
export type { CardProps, CardVariant, CardSize } from './Card/Card';

export { default as FormField, Form } from './Form/Form';
export type { FormFieldProps, FormProps, FieldType } from './Form/Form';

export { default as Modal, useModal } from './Modal/Modal';
export type { ModalProps, ModalSize, ModalAnimation } from './Modal/Modal';

export { Grid, Container, useResponsiveValue } from './Grid/Grid';
export type { 
  GridContainerProps, 
  GridItemProps, 
  ContainerProps, 
  ResponsiveGridProps,
  GridBreakpoint,
  GridColumns,
  GridSpacing 
} from './Grid/Grid';

// Theme and Providers
export { default as ThemeProvider, useTheme, ThemeToggle } from '../../providers/ThemeProvider';

// Design Tokens
export { designTokens, colors, typography, spacing, shadows, animation } from '../../theme/design-tokens';

// Theme configurations
export { 
  lightTheme, 
  darkTheme, 
  createAppTheme 
} from '../../theme/mui-theme';

// Component categories for Storybook and documentation
export const COMPONENT_CATEGORIES = {
  INPUTS: ['Button', 'FormField'],
  LAYOUT: ['Grid', 'Container', 'Card'],
  FEEDBACK: ['Modal'],
  THEME: ['ThemeProvider', 'ThemeToggle'],
} as const;

// Design system version
export const DESIGN_SYSTEM_VERSION = '1.0.0';

// Export everything as a namespace as well
export * as DesignSystem from './index';