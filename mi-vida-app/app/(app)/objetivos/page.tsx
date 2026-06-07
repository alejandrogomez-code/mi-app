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
  const [editObjId, setEditObjId] = useState<string | null>(null);
  const [openMeta, setOpenMeta] = useState<string | null>(null);
  const [editMetaId, setEditMetaId] = useState<string | null>(null);
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

  function abrirNuevoObj() { setEditObjId(null); setForm({ nombre: "", descripcion: "" }); setOpenObj(true); }
  function abrirEdicionObj(e: React.MouseEvent, o: Objetivo) {
    e.stopPropagation();
    setEditObjId(o.id); setForm({ nombre: o.nombre, descripcion: o.descripcion ?? "" }); setOpenObj(true);
  }

  async function guardarObjetivo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.nombre) return;
    if (editObjId) await supabase.from("objetivos").update({ nombre: form.nombre, descripcion: form.descripcion }).eq("id", editObjId);
    else await supabase.from("objetivos").insert({ user_id: user.id, nombre: form.nombre, descripcion: form.descripcion, mes });
    setForm({ nombre: "", descripcion: "" }); setEditObjId(null); setOpenObj(false); load();
  }

  function abrirNuevaMeta(objId: string) { setEditMetaId(null); setMetaForm({ semana: 1, descripcion: "" }); setOpenMeta(objId); }
  function abrirEdicionMeta(m: Meta) {
    setEditMetaId(m.id); setMetaForm({ semana: m.semana, descripcion: m.descripcion ?? "" }); setOpenMeta(m.objetivo_id);
  }

  async function guardarMeta() {
    if (!openMeta) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editMetaId) {
      await supabase.from("metas_semanales").update({ semana: metaForm.semana, descripcion: metaForm.descripcion }).eq("id", editMetaId);
    } else {
      await supabase.from("metas_semanales").insert({
        user_id: user.id, objetivo_id: openMeta, semana: metaForm.semana, descripcion: metaForm.descripcion, estado: "pendiente",
      });
    }
    setMetaForm({ semana: 1, descripcion: "" }); setEditMetaId(null); setOpenMeta(null); load();
  }

  async function toggleMeta(e: React.MouseEvent, m: Meta) {
    e.stopPropagation();
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

  async function borrarObjetivo(e: React.MouseEvent, id: string) { e.stopPropagation(); await supabase.from("objetivos").delete().eq("id", id); load(); }

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
        <Button onClick={abrirNuevoObj}>+ Nuevo</Button>
      </header>

      <Select value={mes} onChange={(e) => setMes(e.target.value)}>
        {mesesOpts.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
      </Select>

      {objetivos.length === 0 && <Empty>Sin objetivos en {nombreMes(mes)}.</Empty>}

      {objetivos.map((o) => {
        const ms = metas.filter((m) => m.objetivo_id === o.id);
        return (
          <Card key={o.id} className="rise space-y-3">
            <div className="flex items-start justify-between cursor-pointer" onClick={(e) => abrirEdicionObj(e, o)}>
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
                <div key={m.id} className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm" style={{ borderColor: "var(--border)" }}>
                  <button onClick={(e) => toggleMeta(e, m)} className="text-base">{m.estado === "cumplido" ? "✅" : m.estado === "no_cumplido" ? "❌" : "⬜"}</button>
                  <span className="flex-1 cursor-pointer" onClick={() => abrirEdicionMeta(m)}>S{m.semana}: {m.descripcion}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => abrirNuevaMeta(o.id)}>+ Meta semanal</Button>
              <Button variant="ghost" onClick={(e) => borrarObjetivo(e, o.id)}>🗑</Button>
            </div>
          </Card>
        );
      })}

      <Sheet open={openObj} onClose={() => { setOpenObj(false); setEditObjId(null); }} title={editObjId ? "Editar objetivo" : "Nuevo objetivo"}>
        <div className="space-y-3">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Descripción"><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Field>
          {!editObjId && <Field label="Mes"><Select value={mes} onChange={(e) => setMes(e.target.value)}>{mesesOpts.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</Select></Field>}
          <Button className="w-full" onClick={guardarObjetivo}>{editObjId ? "Guardar cambios" : "Crear objetivo"}</Button>
        </div>
      </Sheet>

      <Sheet open={!!openMeta} onClose={() => { setOpenMeta(null); setEditMetaId(null); }} title={editMetaId ? "Editar meta" : "Nueva meta semanal"}>
        <div className="space-y-3">
          <Field label="Semana"><Select value={metaForm.semana} onChange={(e) => setMetaForm({ ...metaForm, semana: +e.target.value })}>{[1,2,3,4,5].map((s) => <option key={s} value={s}>Semana {s}</option>)}</Select></Field>
          <Field label="Descripción"><Textarea value={metaForm.descripcion} onChange={(e) => setMetaForm({ ...metaForm, descripcion: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardarMeta}>{editMetaId ? "Guardar cambios" : "Agregar meta"}</Button>
        </div>
      </Sheet>
    </div>
  );
}
