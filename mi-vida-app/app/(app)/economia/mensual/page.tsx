"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatARS } from "@/lib/format";
import { Card, Button, Field, Input, Select, Sheet, SectionTitle } from "@/components/ui";

type Cat = { id: string; ambito: string; nombre: string };
type Saldo = { id?: string; mes: string; categoria_id: string; importe: number };

// Año fiscal Jun..Dic + Acumulado
const MESES = ["06", "07", "08", "09", "10", "11", "12"];
const MESES_LBL = ["Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function MensualPage() {
  const supabase = createClient();
  const anio = new Date().getFullYear();
  const [cats, setCats] = useState<Cat[]>([]);
  const [saldos, setSaldos] = useState<Record<string, number>>({}); // key: `${mes}|${catId}`
  const [mesSel, setMesSel] = useState("06");
  const [openCat, setOpenCat] = useState(false);
  const [catForm, setCatForm] = useState({ ambito: "gasto", nombre: "" });

  const load = useCallback(async () => {
    const { data: c } = await supabase.from("categorias").select("id, ambito, nombre").in("ambito", ["ingreso", "gasto"]).order("ambito");
    setCats(c ?? []);
    const meses = MESES.map((m) => `${anio}-${m}`);
    const { data: s } = await supabase.from("saldos_mensuales").select("*").in("mes", meses);
    const map: Record<string, number> = {};
    (s ?? []).forEach((row: Saldo) => { map[`${row.mes.slice(5)}|${row.categoria_id}`] = row.importe; });
    setSaldos(map);
  }, [anio, supabase]);
  useEffect(() => { load(); }, [load]);

  async function setVal(mes: string, catId: string, importe: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const key = `${mes}|${catId}`;
    setSaldos((s) => ({ ...s, [key]: importe }));
    await supabase.from("saldos_mensuales").upsert(
      { user_id: user.id, mes: `${anio}-${mes}`, categoria_id: catId, importe },
      { onConflict: "user_id,mes,categoria_id" }
    );
  }

  async function crearCat() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !catForm.nombre) return;
    await supabase.from("categorias").insert({ user_id: user.id, ambito: catForm.ambito, nombre: catForm.nombre });
    setCatForm({ ambito: "gasto", nombre: "" }); setOpenCat(false); load();
  }

  const ingresos = cats.filter((c) => c.ambito === "ingreso");
  const gastos = cats.filter((c) => c.ambito === "gasto");

  const sumaMes = (mes: string, lista: Cat[]) => lista.reduce((a, c) => a + (saldos[`${mes}|${c.id}`] ?? 0), 0);
  const sumaCatAnual = (catId: string) => MESES.reduce((a, m) => a + (saldos[`${m}|${catId}`] ?? 0), 0);

  const totIng = sumaMes(mesSel, ingresos);
  const totGas = sumaMes(mesSel, gastos);
  const resultado = totIng - totGas;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Registro mensual</h1>
        <Button variant="ghost" onClick={() => setOpenCat(true)}>+ Categoría</Button>
      </header>

      {/* ===== MOBILE: selector de mes + lista vertical ===== */}
      <div className="sm:hidden space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {MESES.map((m, i) => (
            <button key={m} onClick={() => setMesSel(m)}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: mesSel === m ? "var(--accent)" : "var(--surface-2)", color: mesSel === m ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {MESES_LBL[i]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Ingresos" value={formatARS(totIng)} tone="ok" />
          <MiniStat label="Gastos" value={formatARS(totGas)} tone="danger" />
          <MiniStat label="Resultado" value={formatARS(resultado)} tone={resultado >= 0 ? "accent" : "warn"} />
        </div>

        <SectionTitle>Ingresos</SectionTitle>
        <Card className="divide-y" style={{ borderColor: "var(--border)" }}>
          {ingresos.map((c) => (
            <FilaMobile key={c.id} nombre={c.nombre} value={saldos[`${mesSel}|${c.id}`] ?? 0} onChange={(v) => setVal(mesSel, c.id, v)} />
          ))}
        </Card>

        <SectionTitle>Gastos</SectionTitle>
        <Card className="divide-y" style={{ borderColor: "var(--border)" }}>
          {gastos.map((c) => {
            const v = saldos[`${mesSel}|${c.id}`] ?? 0;
            const pct = totIng ? Math.round((v / totIng) * 100) : 0;
            return <FilaMobile key={c.id} nombre={c.nombre} value={v} sub={totIng ? `${pct}% de ingresos` : undefined} onChange={(nv) => setVal(mesSel, c.id, nv)} />;
          })}
        </Card>

        <Card className="space-y-1.5">
          <Row label="Total ingresos" value={formatARS(totIng)} tone="ok" />
          <Row label="Total gastos" value={formatARS(totGas)} tone="danger" />
          <Row label="Resultado mensual" value={formatARS(resultado)} bold tone={resultado >= 0 ? "ok" : "danger"} />
          <Row label="% ahorro s/ingresos" value={`${totIng ? Math.round((resultado / totIng) * 100) : 0}%`} />
        </Card>
      </div>

      {/* ===== DESKTOP: grilla con scroll horizontal ===== */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="sticky left-0 bg-surface px-2 py-2 text-left">Categoría</th>
              {MESES_LBL.map((m) => <th key={m} className="px-2 py-2 text-right">{m}</th>)}
              <th className="px-2 py-2 text-right">Acum.</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={9} className="px-2 pt-3 pb-1 font-semibold" style={{ color: "var(--ok)" }}>Ingresos</td></tr>
            {ingresos.map((c) => <FilaDesktop key={c.id} cat={c} saldos={saldos} setVal={setVal} sumaCatAnual={sumaCatAnual} />)}
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td className="px-2 py-1.5 font-semibold">Total ingresos</td>
              {MESES.map((m) => <td key={m} className="px-2 py-1.5 text-right font-semibold">{formatARS(sumaMes(m, ingresos))}</td>)}
              <td className="px-2 py-1.5 text-right font-semibold">{formatARS(ingresos.reduce((a, c) => a + sumaCatAnual(c.id), 0))}</td>
            </tr>
            <tr><td colSpan={9} className="px-2 pt-3 pb-1 font-semibold" style={{ color: "var(--danger)" }}>Gastos</td></tr>
            {gastos.map((c) => <FilaDesktop key={c.id} cat={c} saldos={saldos} setVal={setVal} sumaCatAnual={sumaCatAnual} />)}
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td className="px-2 py-1.5 font-semibold">Total gastos</td>
              {MESES.map((m) => <td key={m} className="px-2 py-1.5 text-right font-semibold">{formatARS(sumaMes(m, gastos))}</td>)}
              <td className="px-2 py-1.5 text-right font-semibold">{formatARS(gastos.reduce((a, c) => a + sumaCatAnual(c.id), 0))}</td>
            </tr>
            <tr style={{ borderTop: "2px solid var(--border)" }}>
              <td className="px-2 py-2 font-bold">Resultado</td>
              {MESES.map((m) => {
                const r = sumaMes(m, ingresos) - sumaMes(m, gastos);
                return <td key={m} className="px-2 py-2 text-right font-bold" style={{ color: r >= 0 ? "var(--ok)" : "var(--danger)" }}>{formatARS(r)}</td>;
              })}
              <td className="px-2 py-2 text-right font-bold">{formatARS(ingresos.reduce((a, c) => a + sumaCatAnual(c.id), 0) - gastos.reduce((a, c) => a + sumaCatAnual(c.id), 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Sheet open={openCat} onClose={() => setOpenCat(false)} title="Nueva categoría">
        <div className="space-y-3">
          <Field label="Tipo"><Select value={catForm.ambito} onChange={(e) => setCatForm({ ...catForm, ambito: e.target.value })}><option value="ingreso">Ingreso</option><option value="gasto">Gasto</option></Select></Field>
          <Field label="Nombre"><Input value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} /></Field>
          <Button className="w-full" onClick={crearCat}>Crear</Button>
        </div>
      </Sheet>
    </div>
  );
}

function FilaMobile({ nombre, value, sub, onChange }: { nombre: string; value: number; sub?: string; onChange: (v: number) => void }) {
  const [v, setV] = useState(String(value || ""));
  useEffect(() => { setV(value ? String(value) : ""); }, [value]);
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-sm font-medium">{nombre}</div>
        {sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>}
      </div>
      <input type="number" inputMode="decimal" value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onChange(parseFloat(v) || 0)}
        placeholder="0"
        className="w-28 rounded-lg border bg-surface px-2 py-1.5 text-right text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text)" }} />
    </div>
  );
}

function FilaDesktop({ cat, saldos, setVal, sumaCatAnual }: any) {
  return (
    <tr>
      <td className="sticky left-0 bg-surface px-2 py-1">{cat.nombre}</td>
      {MESES.map((m: string) => {
        const key = `${m}|${cat.id}`;
        return (
          <td key={m} className="px-1 py-1">
            <input type="number" defaultValue={saldos[key] || ""}
              onBlur={(e) => setVal(m, cat.id, parseFloat(e.target.value) || 0)}
              className="w-24 rounded border bg-surface px-1.5 py-1 text-right text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text)" }} />
          </td>
        );
      })}
      <td className="px-2 py-1 text-right text-xs font-semibold">{formatARS(sumaCatAnual(cat.id))}</td>
    </tr>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border bg-surface-2 p-2.5" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-sm font-semibold" style={{ color: `var(--${tone})` }}>{value}</div>
    </div>
  );
}

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className={bold ? "font-bold" : "font-semibold"} style={tone ? { color: `var(--${tone})` } : undefined}>{value}</span>
    </div>
  );
}
