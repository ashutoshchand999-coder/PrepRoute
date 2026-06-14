import React, { ReactNode } from "react";

interface FormFieldProps {
  label?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export const FormField = ({ label, error, children, required, className = "" }: FormFieldProps) => {
  return (
    <div className={`block ${className}`}>
      {label && (
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span>}
    </div>
  );
};
