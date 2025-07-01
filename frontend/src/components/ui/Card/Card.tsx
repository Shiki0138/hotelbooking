import React, { forwardRef } from 'react';
import { Card as MuiCard, CardProps as MuiCardProps, CardContent, CardActions, CardHeader } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens } from '../../../theme/design-tokens';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'glass' | 'gradient';
export type CardSize = 'small' | 'medium' | 'large';

export interface CardProps extends Omit<MuiCardProps, 'variant'> {
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

// Styled card with enhanced variants
const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => 
    prop !== 'variant' && 
    prop !== 'size' && 
    prop !== 'interactive' && 
    prop !== 'loading',
})<{ 
  variant?: CardVariant; 
  size?: CardSize; 
  interactive?: boolean; 
  loading?: boolean; 
}>(({ theme, variant, interactive, loading }) => {
  const baseStyles = {
    borderRadius: designTokens.borderRadius.xl,
    transition: `all ${designTokens.animation.duration.normal} ${designTokens.animation.easing['ease-in-out']}`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    
    // Interactive states
    ...(interactive && {
      cursor: 'pointer',
      '&:hover': {
        transform: loading ? 'none' : 'translateY(-4px)',
        boxShadow: loading ? 'none' : designTokens.shadows.elevation[12],
      },
      '&:active': {
        transform: loading ? 'none' : 'translateY(-2px)',
      },
    }),
    
    // Loading state
    ...(loading && {
      pointerEvents: 'none' as const,
      opacity: 0.7,
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        animation: 'shimmer 1.5s infinite',
      },
    }),
  };

  // Variant-specific styles
  const variantStyles = {
    elevated: {
      boxShadow: designTokens.shadows.elevation[4],
      border: 'none',
      
      '&:hover': {
        boxShadow: interactive ? designTokens.shadows.elevation[12] : designTokens.shadows.elevation[4],
      },
    },
    
    outlined: {
      boxShadow: 'none',
      border: `2px solid ${theme.palette.divider}`,
      
      '&:hover': {
        borderColor: interactive ? theme.palette.primary.main : theme.palette.divider,
        boxShadow: interactive ? designTokens.shadows.elevation[4] : 'none',
      },
    },
    
    filled: {
      backgroundColor: theme.palette.mode === 'light' 
        ? theme.palette.grey[50] 
        : theme.palette.grey[900],
      boxShadow: 'none',
      border: 'none',
      
      '&:hover': {
        backgroundColor: theme.palette.mode === 'light' 
          ? theme.palette.grey[100] 
          : theme.palette.grey[800],
        boxShadow: interactive ? designTokens.shadows.elevation[4] : 'none',
      },
    },
    
    glass: {
      backgroundColor: theme.palette.mode === 'light' 
        ? 'rgba(255, 255, 255, 0.8)' 
        : 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${theme.palette.mode === 'light' 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(255, 255, 255, 0.1)'}`,
      boxShadow: designTokens.shadows.elevation[2],
      
      '&:hover': {
        backgroundColor: theme.palette.mode === 'light' 
          ? 'rgba(255, 255, 255, 0.9)' 
          : 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(24px)',
      },
    },
    
    gradient: {
      background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.secondary.main}10 100%)`,
      border: `1px solid ${theme.palette.primary.main}20`,
      boxShadow: designTokens.shadows.elevation[2],
      
      '&:hover': {
        background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
        borderColor: `${theme.palette.primary.main}30`,
      },
    },
  };

  return {
    ...baseStyles,
    ...(variant && variantStyles[variant]),
  };
});

// Size configurations
const sizeConfig = {
  small: {
    '& .MuiCardContent-root': {
      padding: designTokens.spacing[4],
      '&:last-child': {
        paddingBottom: designTokens.spacing[4],
      },
    },
    '& .MuiCardHeader-root': {
      padding: `${designTokens.spacing[4]} ${designTokens.spacing[4]} 0`,
    },
    '& .MuiCardActions-root': {
      padding: `0 ${designTokens.spacing[4]} ${designTokens.spacing[4]}`,
    },
  },
  medium: {
    '& .MuiCardContent-root': {
      padding: designTokens.spacing[6],
      '&:last-child': {
        paddingBottom: designTokens.spacing[6],
      },
    },
    '& .MuiCardHeader-root': {
      padding: `${designTokens.spacing[6]} ${designTokens.spacing[6]} 0`,
    },
    '& .MuiCardActions-root': {
      padding: `0 ${designTokens.spacing[6]} ${designTokens.spacing[6]}`,
    },
  },
  large: {
    '& .MuiCardContent-root': {
      padding: designTokens.spacing[8],
      '&:last-child': {
        paddingBottom: designTokens.spacing[8],
      },
    },
    '& .MuiCardHeader-root': {
      padding: `${designTokens.spacing[8]} ${designTokens.spacing[8]} 0`,
    },
    '& .MuiCardActions-root': {
      padding: `0 ${designTokens.spacing[8]} ${designTokens.spacing[8]}`,
    },
  },
};

// Shimmer animation keyframes
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// Inject shimmer animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'elevated',
    size = 'medium',
    interactive = false,
    loading = false,
    children,
    sx,
    ...props
  }, ref) => {
    return (
      <StyledCard
        ref={ref}
        variant={variant}
        size={size}
        interactive={interactive}
        loading={loading}
        sx={{
          ...sizeConfig[size],
          ...sx,
        }}
        {...props}
      >
        {children}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

// Export sub-components for convenience
export { CardContent, CardActions, CardHeader };

export default Card;