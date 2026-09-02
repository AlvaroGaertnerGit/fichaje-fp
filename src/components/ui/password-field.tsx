"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  id: string;
  label: string;
};

// Mostrar/ocultar es puramente visual: solo cambia el atributo `type` del
// input entre "password" y "text". El valor en sí nunca se toca, no se
// copia a ningún otro sitio y no cambia lo que se envía al enviar el
// formulario (sigue siendo el mismo <input name="password">).
export function PasswordField({
  id,
  label,
  className = "",
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={
            "w-full border border-line-strong bg-paper-raised px-3.5 py-2.5 pr-10 font-mono text-sm text-ink " +
            "placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 " +
            "focus-visible:outline-stamp " +
            className
          }
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
        >
          {visible ? <EyeSlash size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
