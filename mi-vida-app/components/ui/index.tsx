"use client";
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, useEffect } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[var(--radius)] border bg-surface-2 p-4 ${className}`}
      style={{ borderColor: "var(--border)", ...style }}
    >
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50";
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "#fff" },
    soft:    { background: "var(--accent-soft)", color: "var(--accent)" },
    ghost:   { background: "transparent", color: "var(--text)", border: "1px solid var(--border)" },
    danger:  { background: "var(--danger)", color: "#fff" },
  };
  return <button className={`${base} ${className}`} style={styles[variant]} {...p}>{children}</button>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none focus:border-accent";
const inputStyle = { borderColor: "var(--border)", color: "var(--text)" } as React.CSSProperties;

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} style={inputStyle} {...p} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={inputCls} style={inputStyle} {...p} />;
}
export function Select({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} style={inputStyle} {...p}>{children}</select>;
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "ok" | "warn" | "danger" | "muted" | "accent" }) {
  const map: Record<string, React.CSSProperties> = {
    ok: { background: "color-mix(in srgb, var(--ok) 18%, transparent)", color: "var(--ok)" },
    warn: { background: "color-mix(in srgb, var(--warn) 18%, transparent)", color: "var(--warn)" },
    danger: { background: "color-mix(in srgb, var(--danger) 18%, transparent)", color: "var(--danger)" },
    accent: { background: "var(--accent-soft)", color: "var(--accent)" },
    muted: { background: "var(--surface)", color: "var(--text-muted)" },
  };
  return <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={map[tone]}>{children}</span>;
}

// Bottom sheet para carga rápida en mobile
export function Sheet({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border bg-surface-2 p-5 rise"
        style={{ borderColor: "var(--border)", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-2xl leading-none" style={{ color: "var(--text-muted)" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  // Achica la fuente si el número es largo, para que nunca se desborde.
  const len = value.length;
  const sizeCls = len > 13 ? "text-base" : len > 10 ? "text-lg" : len > 8 ? "text-xl" : "text-2xl";
  return (
    <Card className="rise overflow-hidden">
      <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div
        className={`mt-1 font-display ${sizeCls} font-semibold leading-tight break-words`}
        style={tone ? { color: `var(--${tone})` } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-2 flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>{children}</div>;
}
