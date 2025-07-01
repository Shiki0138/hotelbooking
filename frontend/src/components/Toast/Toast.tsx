import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './Toast.css';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 5000);
    
    return () => clearTimeout(timer);
  }, [toast]);
  
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };
  
  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };
  
  return (
    <div className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <h4 className="toast-title">{toast.title}</h4>
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>
      {toast.action && (
        <button className="toast-action" onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
      <button className="toast-close" onClick={handleClose} aria-label="閉じる">
        ×
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  const container = document.getElementById('toast-container') || createContainer();
  
  function createContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
  }
  
  return ReactDOM.createPortal(
    <div className="toast-wrapper">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>,
    container
  );
};

// Toast Manager Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const success = (title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  };
  
  const error = (title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  };
  
  const warning = (title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  };
  
  const info = (title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  };
  
  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};