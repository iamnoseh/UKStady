import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-brand text-white hover:bg-brandDark shadow-soft',
    secondary: 'border border-line bg-white text-ink hover:bg-panel',
    ghost: 'text-muted hover:bg-panel hover:text-ink',
  };

  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

