import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
};

export function TextField({ id, label, className = "", ...props }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint"
      >
        {label}
      </label>
      <input
        id={id}
        className={
          "border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink " +
          "placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 " +
          "focus-visible:outline-stamp " +
          className
        }
        {...props}
      />
    </div>
  );
}
