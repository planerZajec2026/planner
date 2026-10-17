import type { SelectHTMLAttributes } from "react";

export type Option = { value: string; label: string };

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  id: string;
  label: string;
  options: Option[];
  placeholder?: string;
};

/** Filter-bar select with the small uppercase label (`.field`). */
export function SelectField({ id, label, options, placeholder, className, ...rest }: SelectFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className={["select-field", className].filter(Boolean).join(" ")} {...rest}>
        {placeholder && options.length === 0 && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
