import Link from "next/link";
import { Card } from "@/components/ui";

const subs = [
  { href: "/mas/recordatorios", titulo: "Recordatorios", desc: "Trámites y vencimientos", icon: "🔔" },
  { href: "/mas/tenis", titulo: "Tenis", desc: "Partidos, torneos, efectividad", icon: "🎾" },
  { href: "/habitos/lectura", titulo: "Lectura", desc: "Tus libros del año", icon: "📚" },
  { href: "/mas/configuracion", titulo: "Configuración", desc: "Tema, datos, backup, salir", icon: "⚙️" },
];

export default function MasIndex() {
  return (
    <div className="space-y-4">
      <h1 className="pt-2 font-display text-3xl font-semibold">Más</h1>
      <div className="space-y-5">
        {subs.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card className="flex items-center gap-4 rise">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <h3 className="font-display text-lg font-semibold">{s.titulo}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
