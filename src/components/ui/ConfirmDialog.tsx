import { type ReactNode, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading,
  children,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus confirm button after render
      setTimeout(() => confirmRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const btnColor =
    variant === 'danger'
      ? 'var(--color-danger)'
      : variant === 'warning'
        ? 'var(--color-warning)'
        : 'var(--color-primary)';

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,90vw)] rounded-xl p-6 animate-scale-in"
        style={{
          background: 'var(--surface-0)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-start gap-3">
          {variant !== 'default' && (
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{
                background: variant === 'danger' ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
              }}
            >
              <AlertTriangle
                className="w-5 h-5"
                style={{ color: variant === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)' }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {description && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--surface-2)',
            }}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-60"
            style={{ background: btnColor }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
