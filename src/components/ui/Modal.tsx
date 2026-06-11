import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: 1000 }}
      onClick={onClose}
    >
      <div 
        className="bg-bg-card border border-border rounded-xl w-full max-w-[520px] p-7 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg-elevated border border-border text-gray-400 hover:bg-bg-hover hover:text-white transition-colors flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
