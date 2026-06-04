"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mesActual, nombreMes } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Select, Sheet, SectionTitle, Badge, Empty } from "@/components/ui";

type Objetivo = { id: string; nombre: string; mes: string; descripcion: string | null; pct_avance: number };
type Meta = { id: string; objetivo_id: string; semana: number; descripcion: string | null; estado: string };

export default function ObjetivosPage() {
  const supabase = createClient();
  const [mes, setMes] = useState(mesActual());
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [openObj, setOpenObj] = useState(false);
  const [openMeta, setOpenMeta] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [metaForm, setMetaForm] = useState({ semana: 1, descripcion: "" });

  const load = useCallback(async () => {
    const { data: objs } = await supabase.from("objetivos").select("*").eq("mes", mes).order("created_at");
    setObjetivos(objs ?? []);
    const ids = (objs ?? []).map((o) => o.id);
    if (ids.length) {
      const { data: ms } = await supabase.from("metas_semanales").select("*").in("objetivo_id", ids).order("semana");
      setMetas(ms ?? []);
    } else setMetas([]);
  }, [mes, supabase]);

  useEffect(() => { load(); }, [load]);

  async function crearObjetivo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.nombre) return;
    await supabase.from("objetivos").insert({ user_id: user.id, nombre: form.nombre, descripcion: form.descripcion, mes });
    setForm({ nombre: "", descripcion: "" }); setOpenObj(false); load();
  }

  async function crearMeta() {
    if (!openMeta) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("metas_semanales").insert({
      user_id: user.id, objetivo_id: openMeta, semana: metaForm.semana, descripcion: metaForm.descripcion, estado: "pendiente",
    });
    setMetaForm({ semana: 1, descripcion: "" }); setOpenMeta(null); load();
  }

  async function toggleMeta(m: Meta) {
    const next = m.estado === "cumplido" ? "no_cumplido" : m.estado === "no_cumplido" ? "pendiente" : "cumplido";
    await supabase.from("metas_semanales").update({ estado: next }).eq("id", m.id);
    await recalcAvance(m.objetivo_id);
    load();
  }

  async function recalcAvance(objId: string) {
    const { data } = await supabase.from("metas_semanales").select("estado").eq("objetivo_id", objId);
    const total = (data ?? []).length;
    const ok = (data ?? []).filter((x) => x.estado === "cumplido").length;
    const pct = total ? Math.round((ok / total) * 100) : 0;
    await supabase.from("objetivos").update({ pct_avance: pct }).eq("id", objId);
  }

  async function borrarObjetivo(id: string) {
    await supabase.from("objetivos").delete().eq("id", id);
    load();
  }

  const mesesOpts = (() => {
    const arr: string[] = [];
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 3);
    for (let i = 0; i < 12; i++) { arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); d.setMonth(d.getMonth() + 1); }
    return arr;
  })();

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Objetivos</h1>
        <Button onClick={() => setOpenObj(true)}>+ Nuevo</Button>
      </header>

      <Select value={mes} onChange={(e) => setMes(e.target.value)}>
        {mesesOpts.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
      </Select>

      {objetivos.length === 0 && <Empty>Sin objetivos en {nombreMes(mes)}.</Empty>}

      {objetivos.map((o) => {
        const ms = metas.filter((m) => m.objetivo_id === o.id);
        return (
          <Card key={o.id} className="rise space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{o.nombre}</h3>
                {o.descripcion && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{o.descripcion}</p>}
              </div>
              <Badge tone={o.pct_avance >= 70 ? "ok" : o.pct_avance >= 40 ? "warn" : "muted"}>{Math.round(o.pct_avance)}%</Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${o.pct_avance}%`, background: "var(--accent)" }} />
            </div>
            <div className="space-y-1.5">
              {ms.map((m) => (
                <button key={m.id} onClick={() => toggleMeta(m)}
                  className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm"
                  style={{ borderColor: "var(--border)" }}>
                  <span className="text-base">{m.estado === "cumplido" ? "✅" : m.estado === "no_cumplido" ? "❌" : "⬜"}</span>
                  <span className="flex-1">S{m.semana}: {m.descripcion}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => setOpenMeta(o.id)}>+ Meta semanal</Button>
              <Button variant="ghost" onClick={() => borrarObjetivo(o.id)}>🗑</Button>
            </div>
          </Card>
        );
      })}

      <Sheet open={openObj} onClose={() => setOpenObj(false)} title="Nuevo objetivo">
        <div className="space-y-3">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Descripción"><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Field>
          <Field label="Mes"><Select value={mes} onChange={(e) => setMes(e.target.value)}>{mesesOpts.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</Select></Field>
          <Button className="w-full" onClick={crearObjetivo}>Crear objetivo</Button>
        </div>
      </Sheet>

      <Sheet open={!!openMeta} onClose={() => setOpenMeta(null)} title="Nueva meta semanal">
        <div className="space-y-3">
          <Field label="Semana"><Select value={metaForm.semana} onChange={(e) => setMetaForm({ ...metaForm, semana: +e.target.value })}>{[1,2,3,4,5].map((s) => <option key={s} value={s}>Semana {s}</option>)}</Select></Field>
          <Field label="Descripción"><Textarea value={metaForm.descripcion} onChange={(e) => setMetaForm({ ...metaForm, descripcion: e.target.value })} /></Field>
          <Button className="w-full" onClick={crearMeta}>Agregar meta</Button>
        </div>
      </Sheet>
    </div>
  );
}
