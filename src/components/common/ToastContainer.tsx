import React from 'react';
import { ToastMessage } from '../../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-[#0D9488] shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50/90 text-emerald-950';
      case 'error':
        return 'border-rose-200 bg-rose-50/95 text-rose-950';
      case 'warning':
        return 'border-amber-200 bg-amber-50/95 text-amber-950';
      case 'info':
        return 'border-teal-200 bg-teal-50/95 text-teal-950';
    }
  };

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-xl border shadow-elevated backdrop-blur-md flex items-start justify-between gap-3 transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${getBorderColor(toast.type)}`}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">{getIcon(toast.type)}</div>
            <div>
              <h5 className="font-semibold text-xs leading-tight">{toast.title}</h5>
              <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">{toast.message}</p>
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
