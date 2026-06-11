import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2" style={{ zIndex: 2000 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              animate-fade-in-up px-5 py-3.5 bg-[#161616] border rounded-xl 
              text-sm font-medium flex items-center gap-2.5 shadow-2xl min-w-[280px]
              ${toast.type === 'success' ? 'border-accent text-accent' : ''}
              ${toast.type === 'warning' ? 'border-amber-500 text-amber-500' : ''}
              ${toast.type === 'info' ? 'border-blue-500 text-blue-500' : ''}
            `}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
              ${toast.type === 'success' ? 'bg-accent/10' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500/10' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/10' : ''}
            `}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'i'}
            </div>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
