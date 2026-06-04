import { createSupabaseServer } from "@/lib/supabase/server";
import { mesActual, formatARS, formatNum, formatFecha } from "@/lib/format";
import { StatTile, Card, SectionTitle, Badge } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

function inicioSemanaISO(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default async function Dashboard() {
  const supabase = await createSupabaseServer();
  const mes = mesActual();
  const hoy = new Date().toISOString().slice(0, 10);
  const lunes = inicioSemanaISO();

  const [
    { data: profile },
    { data: objetivos },
    { data: metas },
    { data: actividad },
    { data: comidas },
    { data: recordatorios },
    { data: partidos },
  ] = await Promise.all([
    supabase.from("profiles").select("nombre, objetivo_lectura_anual").single(),
    supabase.from("objetivos").select("id, nombre, pct_avance").eq("mes", mes),
    supabase.from("metas_semanales").select("estado"),
    supabase.from("habitos_actividad").select("tipo, pasos, calorias_est, fecha").gte("fecha", lunes),
    supabase.from("comidas").select("calorias_est, calorias_corregidas").eq("fecha", hoy),
    supabase.from("recordatorios").select("nombre, vencimiento, estado").neq("estado", "finalizado").order("vencimiento", { ascending: true }).limit(4),
    supabase.from("partidos_tenis").select("fecha, contrincante, torneo, estado").order("fecha", { ascending: false }).limit(3),
  ]);

  const metasCumplidas = (metas ?? []).filter((m) => m.estado === "cumplido").length;
  const metasTotal = (metas ?? []).length;
  const cumplSemanal = metasTotal ? Math.round((metasCumplidas / metasTotal) * 100) : 0;

  const pasosSemana = (actividad ?? []).reduce((a, x) => a + (x.pasos ?? 0), 0);
  const calGastadas = (actividad ?? []).reduce((a, x) => a + (x.calorias_est ?? 0), 0);
  const sesiones = (actividad ?? []).length;

  const calHoy = (comidas ?? []).reduce(
    (a, c) => a + (c.calorias_corregidas ?? c.calorias_est ?? 0), 0
  );

  const nombre = profile?.nombre ?? "";

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Hola{nombre ? `, ${nombre}` : ""} 👋</p>
        <h1 className="font-display text-3xl font-semibold">Tu resumen</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Objetivos del mes" value={`${objetivos?.length ?? 0}`} sub="activos" />
        <StatTile label="Cumplimiento semanal" value={`${cumplSemanal}%`} sub={`${metasCumplidas}/${metasTotal} metas`} tone={cumplSemanal >= 70 ? "ok" : cumplSemanal >= 40 ? "warn" : "danger"} />
        <StatTile label="Actividad semanal" value={`${sesiones}`} sub={`${formatNum(pasosSemana)} pasos · ${formatNum(calGastadas)} kcal`} />
        <StatTile label="Calorías de hoy" value={formatNum(calHoy)} sub="kcal ingeridas" tone="accent" />
      </div>

      <section>
        <SectionTitle action={<Link href="/objetivos" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ver todos</Link>}>
          Objetivos del mes
        </SectionTitle>
        {(objetivos ?? []).length === 0 ? (
          <Card><p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin objetivos este mes. <Link href="/objetivos" style={{ color: "var(--accent)" }}>Creá uno</Link></p></Card>
        ) : (
          <div className="space-y-2">
            {objetivos!.map((o) => (
              <Card key={o.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{o.nombre}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-20 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
                    <div className="h-full rounded-full" style={{ width: `${o.pct_avance ?? 0}%`, background: "var(--accent)" }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{Math.round(o.pct_avance ?? 0)}%</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle action={<Link href="/mas/recordatorios" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ver todos</Link>}>
          Próximos vencimientos
        </SectionTitle>
        {(recordatorios ?? []).length === 0 ? (
          <Card><p className="text-sm" style={{ color: "var(--text-muted)" }}>Nada pendiente.</p></Card>
        ) : (
          <div className="space-y-2">
            {recordatorios!.map((r, i) => {
              const venc = r.vencimiento ? new Date(r.vencimiento) : null;
              const vencido = venc && venc < new Date(hoy);
              return (
                <Card key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.nombre}</span>
                  <Badge tone={vencido ? "danger" : "warn"}>{formatFecha(r.vencimiento)}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle action={<Link href="/mas/tenis" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Ver todos</Link>}>
          Tenis reciente
        </SectionTitle>
        {(partidos ?? []).length === 0 ? (
          <Card><p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin partidos registrados.</p></Card>
        ) : (
          <div className="space-y-2">
            {partidos!.map((p, i) => (
              <Card key={i} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{p.contrincante || "—"}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{p.torneo} · {formatFecha(p.fecha)}</div>
                </div>
                <Badge tone={p.estado === "ganado" ? "ok" : p.estado === "perdido" ? "danger" : "muted"}>{p.estado}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
