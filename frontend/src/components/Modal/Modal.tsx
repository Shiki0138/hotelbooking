import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
  footer?: React.ReactNode;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
  footer,
  onAfterOpen,
  onAfterClose
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setShouldRender(true);
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
      
      // Focus trap
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
        onAfterOpen?.();
      }, 100);
    } else {
      setIsAnimating(false);
      document.body.style.overflow = '';
      
      // Restore focus
      setTimeout(() => {
        previousActiveElement.current?.focus();
        setShouldRender(false);
        onAfterClose?.();
      }, 300);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, onAfterOpen, onAfterClose]);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!shouldRender) return null;
  
  const modalContent = (
    <div 
      className={`modal-overlay ${isAnimating ? 'modal-open' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div 
        ref={modalRef}
        className={`modal modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
            {showCloseButton && (
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="閉じる"
              >
                ×
              </button>
            )}
          </div>
        )}
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

// Drawer variant
interface DrawerProps extends Omit<ModalProps, 'size'> {
  position?: 'left' | 'right' | 'top' | 'bottom';
  width?: string;
  height?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  position = 'right',
  width = '400px',
  height = '100%',
  className = '',
  ...props
}) => {
  const drawerStyle = {
    width: position === 'left' || position === 'right' ? width : '100%',
    height: position === 'top' || position === 'bottom' ? height : '100%'
  };
  
  return (
    <Modal
      {...props}
      className={`drawer drawer-${position} ${className}`}
      size="fullscreen"
    >
      <div className="drawer-content" style={drawerStyle}>
        {props.children}
      </div>
    </Modal>
  );
};

// Confirm Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  type = 'info'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'danger': return '🚨';
      default: return 'ℹ️';
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="small"
      className={`confirm-dialog confirm-${type}`}
    >
      <div className="confirm-content">
        <div className="confirm-icon">{getIcon()}</div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
      </div>
      <div className="confirm-actions">
        <button
          className="btn btn-secondary"
          onClick={onCancel}
        >
          {cancelText}
        </button>
        <button
          className={`btn btn-${type === 'danger' ? 'danger' : 'primary'}`}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};