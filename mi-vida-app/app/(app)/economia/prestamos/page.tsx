"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatARS, mesActual, nombreMes, parseAR } from "@/lib/format";
import { Card, Button, Field, Input, Select, Sheet, Empty, StatTile, SectionTitle, Badge } from "@/components/ui";
import { MoneyInput } from "@/components/ui/MoneyInput";

type Cuenta = { id: string; nombre: string; tipo: string; saldo_actual: number };
type Cat = { id: string; ambito: string; nombre: string };
type Mov = { id: string; fecha: string; tipo: string; importe: number; categoria_id: string | null; cuenta_id: string | null; observacion: string | null; mes_imputado: string | null };

export default function SituacionPage() {
  const supabase = createClient();
  const [mes, setMes] = useState(mesActual());
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [openMov, setOpenMov] = useState(false);
  const [openCta, setOpenCta] = useState(false);
  const [editMovId, setEditMovId] = useState<string | null>(null);
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0,10), cuenta_id: "", tipo: "gasto", categoria_id: "", importe: "", observacion: "" });
  const [ctaForm, setCtaForm] = useState({ nombre: "", tipo: "cuenta", saldo_actual: "" });

  const load = useCallback(async () => {
    const [{ data: c }, { data: ct }, { data: m }] = await Promise.all([
      supabase.from("cuentas").select("*").order("orden"),
      supabase.from("categorias").select("id, ambito, nombre"),
      supabase.from("movimientos").select("*").eq("mes_imputado", mes).order("fecha", { ascending: false }),
    ]);
    setCuentas(c ?? []); setCats(ct ?? []); setMovs(m ?? []);
  }, [mes, supabase]);
  useEffect(() => { load(); }, [load]);

  function abrirNuevoMov() {
    setEditMovId(null);
    setForm({ fecha: new Date().toISOString().slice(0,10), cuenta_id: "", tipo: "gasto", categoria_id: "", importe: "", observacion: "" });
    setOpenMov(true);
  }
  function abrirEdicionMov(m: Mov) {
    setEditMovId(m.id);
    setForm({
      fecha: m.fecha, cuenta_id: m.cuenta_id ?? "", tipo: m.tipo,
      categoria_id: m.categoria_id ?? "", importe: String(m.importe), observacion: m.observacion ?? "",
    });
    setOpenMov(true);
  }

  async function guardarMov() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.importe) return;
    const payload = {
      fecha: form.fecha, cuenta_id: form.cuenta_id || null, tipo: form.tipo,
      categoria_id: form.categoria_id || null, importe: parseFloat(form.importe),
      mes_imputado: mes, observacion: form.observacion,
    };
    if (editMovId) await supabase.from("movimientos").update(payload).eq("id", editMovId);
    else await supabase.from("movimientos").insert({ user_id: user.id, ...payload });
    setForm({ fecha: new Date().toISOString().slice(0,10), cuenta_id: "", tipo: "gasto", categoria_id: "", importe: "", observacion: "" });
    setEditMovId(null); setOpenMov(false); load();
  }
  async function guardarCta() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ctaForm.nombre) return;
    await supabase.from("cuentas").insert({
      user_id: user.id, nombre: ctaForm.nombre, tipo: ctaForm.tipo,
      saldo_actual: ctaForm.saldo_actual ? parseFloat(ctaForm.saldo_actual) : 0,
    });
    setCtaForm({ nombre: "", tipo: "cuenta", saldo_actual: "" }); setOpenCta(false); load();
  }
  async function borrarMov(id: string) { await supabase.from("movimientos").delete().eq("id", id); load(); }

  const totalCuentas = cuentas.filter((c) => c.tipo === "cuenta").reduce((a, c) => a + (c.saldo_actual ?? 0), 0);
  const totalAhorro = cuentas.filter((c) => c.tipo === "ahorro").reduce((a, c) => a + (c.saldo_actual ?? 0), 0);

  const ingresos = movs.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.importe, 0);
  const gastos = movs.filter((m) => m.tipo === "gasto").reduce((a, m) => a + m.importe, 0);
  const ahorro = movs.filter((m) => m.tipo === "ahorro").reduce((a, m) => a + m.importe, 0);
  const pctAhorro = ingresos ? Math.round((ahorro / ingresos) * 100) : 0;

  // % de gasto por categoría sobre ingresos
  const gastoPorCat = (() => {
    const map: Record<string, number> = {};
    movs.filter((m) => m.tipo === "gasto").forEach((m) => {
      const nombre = cats.find((c) => c.id === m.categoria_id)?.nombre ?? "Sin categoría";
      map[nombre] = (map[nombre] ?? 0) + m.importe;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  const mesesOpts = (() => {
    const arr: string[] = []; const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 6);
    for (let i = 0; i < 13; i++) { arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); d.setMonth(d.getMonth()+1); }
    return arr;
  })();

  const catsTipo = (tipo: string) => {
    if (tipo === "ingreso") return cats.filter((c) => c.ambito === "ingreso");
    if (tipo === "gasto") return cats.filter((c) => c.ambito === "gasto" || c.ambito === "tarjeta");
    return cats;
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Situación</h1>
        <Button onClick={abrirNuevoMov}>+ Movimiento</Button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="En cuentas" value={formatARS(totalCuentas)} />
        <StatTile label="Ahorrado" value={formatARS(totalAhorro)} tone="accent" />
        <StatTile label="Total" value={formatARS(totalCuentas + totalAhorro)} tone="ok" />
      </div>

      <SectionTitle action={<Button variant="ghost" onClick={() => setOpenCta(true)}>+ Cuenta</Button>}>Cuentas y ahorros</SectionTitle>
      <div className="space-y-2">
        {cuentas.length === 0 && <Empty>Agregá tus cuentas.</Empty>}
        {cuentas.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.nombre}</span>
              <Badge tone={c.tipo === "ahorro" ? "accent" : "muted"}>{c.tipo}</Badge>
            </div>
            <EditableSaldo cuenta={c} onSaved={load} />
          </Card>
        ))}
      </div>

      <Select value={mes} onChange={(e) => setMes(e.target.value)}>{mesesOpts.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</Select>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Ingresos" value={formatARS(ingresos)} tone="ok" />
        <StatTile label="Gastos" value={formatARS(gastos)} tone="danger" />
        <StatTile label="Ahorro" value={formatARS(ahorro)} sub={`${pctAhorro}% de ingresos`} tone="accent" />
      </div>

      {gastoPorCat.length > 0 && (
        <Card>
          <h3 className="mb-3 font-display text-lg font-semibold">Gastos sobre ingresos</h3>
          <div className="space-y-2">
            {gastoPorCat.map(([nombre, monto]) => {
              const pct = ingresos ? Math.round((monto / ingresos) * 100) : 0;
              return (
                <div key={nombre}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{nombre}</span>
                    <span style={{ color: "var(--text-muted)" }}>{formatARS(monto)} · {pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <SectionTitle>Movimientos de {nombreMes(mes)}</SectionTitle>
      <div className="space-y-2">
        {movs.length === 0 && <Empty>Sin movimientos este mes.</Empty>}
        {movs.map((m) => (
          <Card key={m.id} className="flex items-center justify-between cursor-pointer">
            <div className="flex-1" onClick={() => abrirEdicionMov(m)}>
              <div className="text-sm font-medium">{cats.find((c) => c.id === m.categoria_id)?.nombre ?? m.tipo}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{m.observacion || cuentas.find((c) => c.id === m.cuenta_id)?.nombre || "—"}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: m.tipo === "ingreso" ? "var(--ok)" : m.tipo === "gasto" ? "var(--danger)" : "var(--text)" }}>
                {m.tipo === "gasto" ? "-" : "+"}{formatARS(m.importe)}
              </span>
              <button onClick={(e) => { e.stopPropagation(); borrarMov(m.id); }} style={{ color: "var(--text-muted)" }}>🗑</button>
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={openMov} onClose={() => { setOpenMov(false); setEditMovId(null); }} title={editMovId ? "Editar movimiento" : "Cargar movimiento"}>
        <div className="space-y-3">
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Tipo"><Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, categoria_id: "" })}><option value="ingreso">Ingreso</option><option value="gasto">Gasto</option><option value="ahorro">Ahorro</option><option value="transferencia">Transferencia</option></Select></Field>
          <Field label="Cuenta"><Select value={form.cuenta_id} onChange={(e) => setForm({ ...form, cuenta_id: e.target.value })}><option value="">—</option>{cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field>
          <Field label="Categoría"><Select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}><option value="">—</option>{catsTipo(form.tipo).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field>
          <Field label="Importe"><MoneyInput value={form.importe ? parseAR(form.importe) : 0} onChangeValue={(n) => setForm({ ...form, importe: String(n) })} /></Field>
          <Field label="Observación"><Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardarMov}>{editMovId ? "Guardar cambios" : "Guardar"}</Button>
        </div>
      </Sheet>

      <Sheet open={openCta} onClose={() => setOpenCta(false)} title="Nueva cuenta">
        <div className="space-y-3">
          <Field label="Nombre"><Input value={ctaForm.nombre} onChange={(e) => setCtaForm({ ...ctaForm, nombre: e.target.value })} placeholder="Ej: Banco Galicia" /></Field>
          <Field label="Tipo"><Select value={ctaForm.tipo} onChange={(e) => setCtaForm({ ...ctaForm, tipo: e.target.value })}><option value="cuenta">Cuenta</option><option value="ahorro">Ahorro / Inversión</option></Select></Field>
          <Field label="Saldo actual"><MoneyInput value={ctaForm.saldo_actual ? parseAR(ctaForm.saldo_actual) : 0} onChangeValue={(n) => setCtaForm({ ...ctaForm, saldo_actual: String(n) })} /></Field>
          <Button className="w-full" onClick={guardarCta}>Crear</Button>
        </div>
      </Sheet>
    </div>
  );
}

function EditableSaldo({ cuenta, onSaved }: { cuenta: Cuenta; onSaved: () => void }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(cuenta.saldo_actual ?? 0).replace(".", ","));
  async function save() {
    await supabase.from("cuentas").update({ saldo_actual: parseAR(val) }).eq("id", cuenta.id);
    setEditing(false); onSaved();
  }
  if (editing) return (
    <div className="flex items-center gap-1">
      <input className="w-32 rounded-lg border bg-surface px-2 py-1 text-right text-sm" style={{ borderColor: "var(--border)", color: "var(--text)" }}
        inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d,-]/g, ""))} autoFocus />
      <button onClick={save} style={{ color: "var(--ok)" }}>✓</button>
    </div>
  );
  return <button onClick={() => setEditing(true)} className="text-sm font-semibold">{formatARS(cuenta.saldo_actual)}</button>;
}
