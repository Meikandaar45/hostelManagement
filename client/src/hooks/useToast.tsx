import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'danger';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (typeOrOptions: ToastType | { title: string, description?: string, type?: ToastType }, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (typeOrOptions: ToastType | { title: string, description?: string, type?: ToastType }, message?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      
      let type: ToastType = 'info';
      let msg = '';
      
      if (typeof typeOrOptions === 'string') {
        type = typeOrOptions;
        msg = message || '';
      } else {
        type = typeOrOptions.type || 'info';
        msg = typeOrOptions.description 
          ? `${typeOrOptions.title}: ${typeOrOptions.description}` 
          : typeOrOptions.title;
      }
      
      setToasts((prev) => [...prev, { id, type, message: msg }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
