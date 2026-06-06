"use client";
import { useEffect, useState } from "react";
import { formatARS, parseAR } from "@/lib/format";

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
    if (!focused) setRaw(value ? String(value).replace(".", ",") : "");
  }, [value, focused]);

  const display = focused ? raw : (value || value === 0 ? formatARS(value) : "");

  return (
    <input
      inputMode="decimal"
      className={`w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none focus:border-accent ${align === "right" ? "text-right" : ""} ${className}`}
      style={{ borderColor: "var(--border)", color: "var(--text)" }}
      placeholder={focused ? placeholder : `$ ${placeholder}`}
      value={display}
      onFocus={() => { setFocused(true); setRaw(value ? String(value).replace(".", ",") : ""); }}
      onChange={(e) => setRaw(e.target.value.replace(/[^\d,-]/g, ""))}
      onBlur={() => { setFocused(false); onChangeValue(parseAR(raw)); }}
    />
  );
}
