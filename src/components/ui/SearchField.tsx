import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

/** Pill search input from the design. `label` is announced to screen readers. */
export function SearchField({ label, ...rest }: SearchFieldProps) {
  return (
    <div className="search-field">
      <Icon name="search" />
      <input type="search" aria-label={label} {...rest} />
    </div>
  );
}
