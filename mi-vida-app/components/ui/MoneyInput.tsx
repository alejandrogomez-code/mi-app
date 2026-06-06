"use client";
import { useEffect, useState } from "react";
import { formatARS, parseAR } from "@/lib/format";

/**
 * Input de dinero estilo AR.
 * - Con foco: muestra el número crudo editable (coma decimal: 164145,40).
 * - Sin foco (blur): muestra "$ 164.145,40".
 * - onChangeValue devuelve siempre el number real.
 */
export function MoneyInput({
  value,
  onChangeValue,
  placeholder = "0,00",
  className = "",
  align = "left",
}: {
  value: number | null | undefined;
  onChangeValue: (n: number) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (!focused) {
      setRaw(value ? String(value).replace(".", ",") : "");
    }
  }, [value, focused]);

  const display = focused
    ? raw
    : value || value === 0
    ? formatARS(value)
    : "";

  return (
    <input
      inputMode="decimal"
      className={`w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none focus:border-accent ${align === "right" ? "text-right" : ""} ${className}`}
      style={{ borderColor: "var(--border)", color: "var(--text)" }}
      placeholder={focused ? placeholder : `$ ${placeholder}`}
      value={display}
      onFocus={() => {
        setFocused(true);
        setRaw(value ? String(value).replace(".", ",") : "");
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d,-]/g, "");
        setRaw(v);
      }}
      onBlur={() => {
        setFocused(false);
        onChangeValue(parseAR(raw));
      }}
    />
  );
}
