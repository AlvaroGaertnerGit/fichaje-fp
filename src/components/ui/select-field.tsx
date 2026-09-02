import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  placeholder: string;
};

export function SelectField({
  id,
  label,
  options,
  placeholder,
  className = "",
  ...props
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint"
      >
        {label}
      </label>
      <select
        id={id}
        defaultValue=""
        className={
          "border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink " +
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stamp " +
          className
        }
        {...props}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
