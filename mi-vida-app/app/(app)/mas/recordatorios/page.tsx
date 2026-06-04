"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFecha } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Select, Sheet, Badge, Empty } from "@/components/ui";

type Rec = { id: string; nombre: string; vencimiento: string | null; estado: string; observacion: string | null };

export default function RecordatoriosPage() {
  const supabase = createClient();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", vencimiento: "", estado: "pendiente", observacion: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("recordatorios").select("*").order("vencimiento", { ascending: true });
    setRecs(data ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.nombre) return;
    await supabase.from("recordatorios").insert({ user_id: user.id, nombre: form.nombre, vencimiento: form.vencimiento || null, estado: form.estado, observacion: form.observacion });
    setForm({ nombre: "", vencimiento: "", estado: "pendiente", observacion: "" }); setOpen(false); load();
  }
  async function cambiarEstado(r: Rec) {
    const next = r.estado === "pendiente" ? "en_curso" : r.estado === "en_curso" ? "finalizado" : "pendiente";
    await supabase.from("recordatorios").update({ estado: next }).eq("id", r.id); load();
  }
  async function borrar(id: string) { await supabase.from("recordatorios").delete().eq("id", id); load(); }

  const hoy = new Date().toISOString().slice(0, 10);
  const filtrados = recs.filter((r) => filtro === "todos" || r.estado === filtro);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Recordatorios</h1>
        <Button onClick={() => setOpen(true)}>+ Nuevo</Button>
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
            <Card key={r.id} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium">{r.nombre}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.observacion || "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                {r.vencimiento && <Badge tone={vencido ? "danger" : "muted"}>{formatFecha(r.vencimiento)}</Badge>}
                <button onClick={() => cambiarEstado(r)}>
                  <Badge tone={r.estado === "finalizado" ? "ok" : r.estado === "en_curso" ? "warn" : "muted"}>{r.estado === "en_curso" ? "en curso" : r.estado}</Badge>
                </button>
                <button onClick={() => borrar(r.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
              </div>
            </Card>
          );
        })}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo recordatorio">
        <div className="space-y-3">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Renovar VTV" /></Field>
          <Field label="Vencimiento"><Input type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} /></Field>
          <Field label="Estado"><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="finalizado">Finalizado</option></Select></Field>
          <Field label="Observación"><Textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardar}>Guardar</Button>
        </div>
      </Sheet>
    </div>
  );
}
