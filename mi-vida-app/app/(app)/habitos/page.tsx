import Link from "next/link";
import { Card } from "@/components/ui";

const subs = [
  { href: "/habitos/actividad", titulo: "Actividad física", desc: "Gimnasio, tenis, pasos, calorías", icon: "🏃" },
  { href: "/habitos/comida", titulo: "Comida saludable", desc: "Registro de comidas y calorías", icon: "🥗" },
  { href: "/habitos/peso", titulo: "Peso e IMC", desc: "Evolución, objetivo, plan", icon: "⚖️" },
  { href: "/habitos/lectura", titulo: "Lectura", desc: "5 libros hasta fin de año", icon: "📚" },
];

export default function HabitosIndex() {
  return (
    <div className="space-y-4">
      <h1 className="pt-2 font-display text-3xl font-semibold">Hábitos</h1>
      <div className="space-y-5">
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
