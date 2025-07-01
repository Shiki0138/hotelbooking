import React, { forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogProps,
  IconButton,
  Slide,
  Fade,
  Grow,
  Zoom,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { styled } from '@mui/material/styles';
import { Close } from '@mui/icons-material';
import { designTokens } from '../../../theme/design-tokens';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
export type ModalAnimation = 'fade' | 'slide' | 'grow' | 'zoom';

export interface ModalProps extends Omit<DialogProps, 'maxWidth'> {
  size?: ModalSize;
  animation?: ModalAnimation;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscapeKey?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: designTokens.borderRadius['2xl'],
    boxShadow: designTokens.shadows.elevation[24],
    backgroundColor: theme.palette.background.paper,
    backgroundImage: 'none',
    
    // Glass effect for modern look
    ...(theme.palette.mode === 'dark' && {
      backgroundColor: 'rgba(18, 18, 18, 0.9)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${theme.palette.divider}`,
    }),
  },
  
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: designTokens.spacing[6],
  paddingBottom: designTokens.spacing[4],
  position: 'relative',
  
  '& .modal-title': {
    fontSize: designTokens.typography.fontSize['headline-medium'].size,
    fontWeight: 600,
    lineHeight: designTokens.typography.fontSize['headline-medium'].lineHeight,
    margin: 0,
  },
  
  '& .modal-subtitle': {
    fontSize: designTokens.typography.fontSize['body-medium'].size,
    color: theme.palette.text.secondary,
    marginTop: designTokens.spacing[1],
    margin: 0,
  },
  
  '& .close-button': {
    position: 'absolute',
    right: designTokens.spacing[4],
    top: designTokens.spacing[4],
    color: theme.palette.text.secondary,
    transition: `all ${designTokens.animation.duration.fast} ${designTokens.animation.easing['ease-in-out']}`,
    
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.action.hover,
      transform: 'scale(1.1)',
    },
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: `0 ${designTokens.spacing[6]} ${designTokens.spacing[4]}`,
  
  '&:first-of-type': {
    paddingTop: designTokens.spacing[4],
  },
  
  // Custom scrollbar
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.action.hover,
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.action.disabled,
    borderRadius: '4px',
    
    '&:hover': {
      background: theme.palette.text.disabled,
    },
  },
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]} ${designTokens.spacing[6]}`,
  gap: designTokens.spacing[3],
  
  '& .MuiButton-root': {
    minWidth: '120px',
  },
}));

// Size configurations
const sizeConfig = {
  xs: { maxWidth: '320px' },
  sm: { maxWidth: '480px' },
  md: { maxWidth: '640px' },
  lg: { maxWidth: '896px' },
  xl: { maxWidth: '1152px' },
  fullscreen: { 
    maxWidth: '100vw', 
    maxHeight: '100vh',
    margin: 0,
    borderRadius: 0,
  },
};

// Animation transitions
const SlideTransition = forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function SlideTransition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

const FadeTransition = forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function FadeTransition(props, ref) {
    return <Fade ref={ref} {...props} />;
  }
);

const GrowTransition = forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function GrowTransition(props, ref) {
    return <Grow ref={ref} {...props} />;
  }
);

const ZoomTransition = forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function ZoomTransition(props, ref) {
    return <Zoom ref={ref} {...props} />;
  }
);

const getTransitionComponent = (animation: ModalAnimation) => {
  switch (animation) {
    case 'slide':
      return SlideTransition;
    case 'grow':
      return GrowTransition;
    case 'zoom':
      return ZoomTransition;
    case 'fade':
    default:
      return FadeTransition;
  }
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({
    size = 'md',
    animation = 'fade',
    title,
    subtitle,
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEscapeKey = true,
    actions,
    children,
    onClose,
    sx,
    ...props
  }, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const TransitionComponent = getTransitionComponent(animation);
    
    // Force fullscreen on mobile for larger modals
    const actualSize = isMobile && (size === 'lg' || size === 'xl') ? 'fullscreen' : size;
    
    const handleClose = (event: {}, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason === 'backdropClick' && !closeOnBackdropClick) return;
      if (reason === 'escapeKeyDown' && !closeOnEscapeKey) return;
      
      if (onClose) {
        onClose(event, reason);
      }
    };

    const handleCloseButtonClick = () => {
      if (onClose) {
        onClose({}, 'backdropClick');
      }
    };

    return (
      <StyledDialog
        ref={ref}
        onClose={handleClose}
        TransitionComponent={TransitionComponent}
        transitionDuration={{
          enter: parseInt(designTokens.animation.duration.normal),
          exit: parseInt(designTokens.animation.duration.fast),
        }}
        sx={{
          '& .MuiDialog-paper': {
            ...sizeConfig[actualSize],
            ...(actualSize === 'fullscreen' && {
              margin: 0,
              maxHeight: '100vh',
              height: '100vh',
              borderRadius: 0,
            }),
          },
          ...sx,
        }}
        {...props}
      >
        {(title || subtitle || showCloseButton) && (
          <StyledDialogTitle>
            <Box>
              {title && (
                <Typography className="modal-title" component="h2">
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography className="modal-subtitle" component="p">
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            {showCloseButton && (
              <IconButton
                className="close-button"
                onClick={handleCloseButtonClick}
                size="medium"
                aria-label="Close modal"
              >
                <Close />
              </IconButton>
            )}
          </StyledDialogTitle>
        )}
        
        <StyledDialogContent dividers={Boolean(title || subtitle || actions)}>
          {children}
        </StyledDialogContent>
        
        {actions && (
          <StyledDialogActions>
            {actions}
          </StyledDialogActions>
        )}
      </StyledDialog>
    );
  }
);

Modal.displayName = 'Modal';

// Convenience hook for modal state management
export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen(!isOpen), [isOpen]);
  
  return {
    isOpen,
    open,
    close,
    toggle,
    modalProps: {
      open: isOpen,
      onClose: close,
    },
  };
};

export default Modal;