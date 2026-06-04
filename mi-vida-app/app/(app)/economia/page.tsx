import Link from "next/link";
import { Card } from "@/components/ui";

const subs = [
  { href: "/economia/situacion", titulo: "Situación actual", desc: "Saldos, movimientos, análisis", icon: "💰" },
  { href: "/economia/mensual", titulo: "Registro mensual", desc: "Proyección por mes (estilo Excel)", icon: "📊" },
  { href: "/economia/tarjetas", titulo: "Tarjetas de crédito", desc: "Resúmenes, consumos, cuotas", icon: "💳" },
  { href: "/economia/prestamos", titulo: "Préstamos", desc: "Cuotas y vencimientos", icon: "🏦" },
];

export default function EconomiaIndex() {
  return (
    <div className="space-y-4">
      <h1 className="pt-2 font-display text-3xl font-semibold">Economía</h1>
      <div className="space-y-3">
        {subs.map((s) => (
          <Link key={s.href} href={s.href}>
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
