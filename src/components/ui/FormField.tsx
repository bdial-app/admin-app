import { type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, description, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {description && !error && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
