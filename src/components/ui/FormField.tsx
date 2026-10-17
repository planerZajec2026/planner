import type { CSSProperties, ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Form label + control (`.form-field`). The control must use the same `id`;
 * pass `aria-invalid` / `aria-describedby={`${id}-error`}` on it when `error` is set.
 */
export function FormField({ id, label, hint, error, children, style }: FormFieldProps) {
  return (
    <div className="form-field" style={style}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
