"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFecha } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Select, Sheet, Badge, Empty } from "@/components/ui";

type Rec = { id: string; nombre: string; vencimiento: string | null; estado: string; observacion: string | null };

const VACIO = { nombre: "", vencimiento: "", estado: "pendiente", observacion: "" };

export default function RecordatoriosPage() {
  const supabase = createClient();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(VACIO);

  const load = useCallback(async () => {
    const { data } = await supabase.from("recordatorios").select("*").order("vencimiento", { ascending: true });
    setRecs(data ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  function abrirNuevo() { setEditId(null); setForm(VACIO); setOpen(true); }
  function abrirEdicion(r: Rec) {
    setEditId(r.id);
    setForm({ nombre: r.nombre, vencimiento: r.vencimiento ?? "", estado: r.estado, observacion: r.observacion ?? "" });
    setOpen(true);
  }

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.nombre) return;
    const payload = { nombre: form.nombre, vencimiento: form.vencimiento || null, estado: form.estado, observacion: form.observacion };
    if (editId) await supabase.from("recordatorios").update(payload).eq("id", editId);
    else await supabase.from("recordatorios").insert({ user_id: user.id, ...payload });
    setForm(VACIO); setEditId(null); setOpen(false); load();
  }
  async function cambiarEstado(e: React.MouseEvent, r: Rec) {
    e.stopPropagation();
    const next = r.estado === "pendiente" ? "en_curso" : r.estado === "en_curso" ? "finalizado" : "pendiente";
    await supabase.from("recordatorios").update({ estado: next }).eq("id", r.id); load();
  }
  async function borrar(e: React.MouseEvent, id: string) { e.stopPropagation(); await supabase.from("recordatorios").delete().eq("id", id); load(); }

  const hoy = new Date().toISOString().slice(0, 10);
  const filtrados = recs.filter((r) => filtro === "todos" || r.estado === filtro);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Recordatorios</h1>
        <Button onClick={abrirNuevo}>+ Nuevo</Button>
      </header>
      <div className="flex gap-1.5">
        {["todos", "pendiente", "en_curso", "finalizado"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: filtro === f ? "var(--accent)" : "var(--surface-2)", color: filtro === f ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {f === "en_curso" ? "en curso" : f}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtrados.length === 0 && <Empty>Sin recordatorios.</Empty>}
        {filtrados.map((r) => {
          const vencido = r.vencimiento && r.vencimiento < hoy && r.estado !== "finalizado";
          return (
            <Card key={r.id} className="flex items-center justify-between cursor-pointer">
              <div className="flex-1" onClick={() => abrirEdicion(r)}>
                <div className="text-sm font-medium">{r.nombre}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.observacion || "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                {r.vencimiento && <Badge tone={vencido ? "danger" : "muted"}>{formatFecha(r.vencimiento)}</Badge>}
                <button onClick={(e) => cambiarEstado(e, r)}>
                  <Badge tone={r.estado === "finalizado" ? "ok" : r.estado === "en_curso" ? "warn" : "muted"}>{r.estado === "en_curso" ? "en curso" : r.estado}</Badge>
                </button>
                <button onClick={(e) => borrar(e, r.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
              </div>
            </Card>
          );
        })}
      </div>
      <Sheet open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? "Editar recordatorio" : "Nuevo recordatorio"}>
        <div className="space-y-3">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Renovar VTV" /></Field>
          <Field label="Vencimiento"><Input type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} /></Field>
          <Field label="Estado"><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="finalizado">Finalizado</option></Select></Field>
          <Field label="Observación"><Textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardar}>{editId ? "Guardar cambios" : "Guardar"}</Button>
        </div>
      </Sheet>
    </div>
  );
}
