"use client";
import { useEffect, useState } from "react";

const PALETAS = [
  { id: "indigo", color: "#6366f1", nombre: "Índigo" },
  { id: "esmeralda", color: "#10b981", nombre: "Esmeralda" },
  { id: "ambar", color: "#f59e0b", nombre: "Ámbar" },
  { id: "rosa", color: "#ec4899", nombre: "Rosa" },
  { id: "grafito", color: "#64748b", nombre: "Grafito" },
];

export default function ThemeSwitcher() {
  const [mode, setMode] = useState("dark");
  const [paleta, setPaleta] = useState("indigo");

  useEffect(() => {
    setMode(localStorage.getItem("mv-mode") || "dark");
    setPaleta(localStorage.getItem("mv-paleta") || "indigo");
  }, []);

  function apply(m: string, p: string) {
    document.documentElement.setAttribute("data-mode", m);
    document.documentElement.setAttribute("data-paleta", p);
    localStorage.setItem("mv-mode", m);
    localStorage.setItem("mv-paleta", p);
    setMode(m); setPaleta(p);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Modo</div>
        <div className="flex gap-2">
          {["dark", "light"].map((m) => (
            <button key={m} onClick={() => apply(m, paleta)}
              className="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold capitalize"
              style={{
                borderColor: mode === m ? "var(--accent)" : "var(--border)",
                color: mode === m ? "var(--accent)" : "var(--text)",
                background: mode === m ? "var(--accent-soft)" : "transparent",
              }}>
              {m === "dark" ? "Oscuro" : "Claro"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Paleta</div>
        <div className="flex gap-3">
          {PALETAS.map((p) => (
            <button key={p.id} onClick={() => apply(mode, p.id)}
              className="h-10 w-10 rounded-full border-2 transition"
              title={p.nombre}
              style={{
                background: p.color,
                borderColor: paleta === p.id ? "var(--text)" : "transparent",
                transform: paleta === p.id ? "scale(1.1)" : "scale(1)",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}
