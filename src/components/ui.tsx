'use client';

import { useEffect, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'quiet' };
export function Button({ tone = 'primary', className = '', children, ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${tone} ${className}`.trim()} {...props}>{children}</button>;
}
export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card ${className}`.trim()} {...props}>{children}</div>;
}
type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string };
export function Input({ label, hint, error, id, className = '', ...props }: InputProps) {
  const inputId = id || props.name;
  return <label className={`ui-field ${error ? 'is-invalid' : ''}`.trim()} htmlFor={inputId}>
    {label && <span className="ui-field__label">{label}</span>}
    <input id={inputId} className={`ui-input ${className}`.trim()} aria-invalid={!!error || undefined} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props} />
    {error ? <small className="ui-field__error" id={`${inputId}-error`}>{error}</small> : hint ? <small className="ui-field__hint" id={`${inputId}-hint`}>{hint}</small> : null}
  </label>;
}
export function Avatar({ name, src, className = '' }: { name: string; src?: string | null; className?: string }) {
  return <span className={`ui-avatar ${className}`.trim()} aria-label={name}>{src ? <img src={src} alt="" loading="lazy" /> : (name.trim()[0] || 'V').toUpperCase()}</span>;
}
export function Chip({ children, active = false, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { active?: boolean }) {
  return <span className={`ui-chip ${active ? 'is-active' : ''} ${className}`.trim()} {...props}>{children}</span>;
}
export function Toast({ children, kind = 'success', onClose }: { children: ReactNode; kind?: 'success' | 'error' | 'info'; onClose?: () => void }) {
  return <div className={`ui-toast ui-toast--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}{onClose && <button type="button" className="ui-toast__close" onClick={onClose} aria-label="Dismiss notification">×</button>}</div>;
}
export function EmptyState({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children?: ReactNode }) {
  return <section className="ui-empty"><span className="ui-empty__spark" aria-hidden="true">✦</span><h3>{title}</h3>{description && <p>{description}</p>}{children}{action && <div className="ui-empty__action">{action}</div>}</section>;
}
export function ErrorCard({ title = 'Something went wrong', description = 'Please try again in a moment.', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <section className="ui-error" role="alert"><span aria-hidden="true">✦</span><div><strong>{title}</strong><p>{description}</p>{onRetry && <Button tone="secondary" type="button" onClick={onRetry}>Try again</Button>}</div></section>;
}
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-skeleton ${className}`.trim()} aria-hidden="true" {...props} />;
}
export function Sheet({ open, title, onClose, children, className = '' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="ui-sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`ui-sheet ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title}>
      <div className="ui-sheet__handle" /><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></header>{children}
    </section>
  </div>;
}
export function NavBar({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <nav className={`ui-navbar ${className}`.trim()} {...props}>{children}</nav>;
}
export function Drawer({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <aside className={`ui-drawer ${className}`.trim()} {...props}>{children}</aside>;
}
