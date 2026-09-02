import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

const base =
  "inline-flex items-center justify-center gap-2 border font-mono text-sm font-semibold " +
  "uppercase tracking-wide transition-[transform,background-color,border-color] duration-150 " +
  "ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-stamp disabled:cursor-default disabled:opacity-70";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border-ink bg-ink text-paper-raised px-5 py-3 hover:bg-stamp-ink hover:border-stamp-ink",
  ghost:
    "border-line-strong bg-transparent text-ink-dim px-4 py-2.5 hover:text-ink hover:border-ink",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
