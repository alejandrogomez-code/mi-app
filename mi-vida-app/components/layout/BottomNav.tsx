"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio", icon: "M3 11l9-8 9 8M5 10v10h14V10" },
  { href: "/objetivos", label: "Objetivos", icon: "M12 2v20M2 12h20" },
  { href: "/habitos", label: "Hábitos", icon: "M4 19h16M7 16V8m5 8V4m5 12v-6" },
  { href: "/economia", label: "Economía", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
  { href: "/mas", label: "Más", icon: "M4 6h16M4 12h16M4 18h16" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 mx-auto flex max-w-lg justify-around border-t bg-surface-2/95 backdrop-blur"
      style={{ borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
            style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={it.icon} />
            </svg>
            <span className="text-[10px] font-semibold">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
