import React, { forwardRef } from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens } from '../../../theme/design-tokens';

// Extended button variants
export type ButtonVariant = 'contained' | 'outlined' | 'text' | 'gradient' | 'glass';
export type ButtonSize = 'small' | 'medium' | 'large' | 'extra-large';
export type ButtonColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size' | 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

// Styled button with enhanced variants
const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'loading',
})<{ variant?: ButtonVariant; loading?: boolean }>(({ theme, variant, loading }) => {
  const baseStyles = {
    borderRadius: designTokens.borderRadius.lg,
    fontWeight: 600,
    letterSpacing: '0.025em',
    textTransform: 'none' as const,
    transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing['ease-in-out']}`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    
    // Hover effects
    '&:hover': {
      transform: loading ? 'none' : 'translateY(-2px)',
      boxShadow: loading ? 'none' : designTokens.shadows.elevation[6],
    },
    
    // Active state
    '&:active': {
      transform: loading ? 'none' : 'translateY(-1px)',
    },
    
    // Disabled state
    '&:disabled': {
      transform: 'none',
      boxShadow: 'none',
    },
    
    // Loading state
    ...(loading && {
      pointerEvents: 'none' as const,
      '&:hover': {
        transform: 'none',
        boxShadow: 'none',
      },
    }),
    
    // Ripple effect
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
      transform: 'translateX(-100%)',
      transition: `transform ${designTokens.animation.duration.slow} ${designTokens.animation.easing['ease-in-out']}`,
    },
    
    '&:hover::before': {
      transform: 'translateX(100%)',
    },
  };

  // Variant-specific styles
  const variantStyles = {
    gradient: {
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
      color: theme.palette.primary.contrastText,
      border: 'none',
      boxShadow: designTokens.shadows.elevation[4],
      
      '&:hover': {
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
        boxShadow: designTokens.shadows.elevation[8],
      },
      
      '&:disabled': {
        background: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
      },
    },
    
    glass: {
      background: theme.palette.mode === 'light' 
        ? 'rgba(255, 255, 255, 0.25)' 
        : 'rgba(0, 0, 0, 0.25)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${theme.palette.mode === 'light' 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(255, 255, 255, 0.1)'}`,
      color: theme.palette.text.primary,
      
      '&:hover': {
        background: theme.palette.mode === 'light' 
          ? 'rgba(255, 255, 255, 0.35)' 
          : 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
      },
    },
  };

  return {
    ...baseStyles,
    ...(variant === 'gradient' && variantStyles.gradient),
    ...(variant === 'glass' && variantStyles.glass),
  };
});

// Size configurations
const sizeConfig = {
  small: {
    height: '36px',
    padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
    fontSize: designTokens.typography.fontSize['label-medium'].size,
  },
  medium: {
    height: '44px',
    padding: `${designTokens.spacing[3]} ${designTokens.spacing[6]}`,
    fontSize: designTokens.typography.fontSize['label-large'].size,
  },
  large: {
    height: '52px',
    padding: `${designTokens.spacing[4]} ${designTokens.spacing[8]}`,
    fontSize: designTokens.typography.fontSize['title-medium'].size,
  },
  'extra-large': {
    height: '60px',
    padding: `${designTokens.spacing[5]} ${designTokens.spacing[10]}`,
    fontSize: designTokens.typography.fontSize['title-large'].size,
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'contained',
    size = 'medium',
    color = 'primary',
    loading = false,
    loadingText,
    startIcon,
    endIcon,
    children,
    disabled,
    sx,
    ...props
  }, ref) => {
    const isCustomVariant = variant === 'gradient' || variant === 'glass';
    const muiVariant = isCustomVariant ? 'contained' : variant;
    
    const buttonContent = (
      <>
        {loading && (
          <CircularProgress
            size={20}
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: '-10px',
              marginTop: '-10px',
              color: 'inherit',
            }}
          />
        )}
        <span
          style={{
            opacity: loading ? 0 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: designTokens.spacing[2],
          }}
        >
          {startIcon}
          {loading && loadingText ? loadingText : children}
          {endIcon}
        </span>
      </>
    );

    return (
      <StyledButton
        ref={ref}
        variant={muiVariant}
        color={color}
        disabled={disabled || loading}
        loading={loading}
        sx={{
          ...sizeConfig[size],
          ...sx,
        }}
        {...props}
      >
        {buttonContent}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;