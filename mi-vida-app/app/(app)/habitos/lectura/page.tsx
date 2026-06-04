"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Field, Input, Textarea, Select, Sheet, Badge, Empty, StatTile } from "@/components/ui";

type Libro = { id: string; nombre: string; fecha_inicio: string | null; fecha_fin: string | null; estado: string; clasificacion: string | null; observaciones: string | null };

export default function LecturaPage() {
  const supabase = createClient();
  const [libros, setLibros] = useState<Libro[]>([]);
  const [meta, setMeta] = useState(5);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", estado: "pendiente", clasificacion: "", fecha_inicio: "", fecha_fin: "", observaciones: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("libros").select("*").order("created_at", { ascending: false });
    setLibros(data ?? []);
    const { data: p } = await supabase.from("profiles").select("objetivo_lectura_anual").single();
    if (p?.objetivo_lectura_anual) setMeta(p.objetivo_lectura_anual);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.nombre) return;
    await supabase.from("libros").insert({
      user_id: user.id, nombre: form.nombre, estado: form.estado, clasificacion: form.clasificacion,
      fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null, observaciones: form.observaciones,
    });
    setForm({ nombre: "", estado: "pendiente", clasificacion: "", fecha_inicio: "", fecha_fin: "", observaciones: "" });
    setOpen(false); load();
  }
  async function cambiarEstado(l: Libro) {
    const next = l.estado === "pendiente" ? "en_curso" : l.estado === "en_curso" ? "finalizado" : "pendiente";
    const patch: any = { estado: next };
    if (next === "finalizado") patch.fecha_fin = new Date().toISOString().slice(0,10);
    await supabase.from("libros").update(patch).eq("id", l.id); load();
  }
  async function borrar(id: string) { await supabase.from("libros").delete().eq("id", id); load(); }

  const leidos = libros.filter((l) => l.estado === "finalizado").length;
  const enCurso = libros.filter((l) => l.estado === "en_curso").length;
  const pct = Math.min(100, Math.round((leidos / meta) * 100));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Lectura</h1>
        <Button onClick={() => setOpen(true)}>+ Libro</Button>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Leídos" value={`${leidos}/${meta}`} sub={`${pct}%`} tone={pct >= 100 ? "ok" : undefined} />
        <StatTile label="En curso" value={`${enCurso}`} />
        <StatTile label="Total" value={`${libros.length}`} />
      </div>
      <Card>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
        </div>
      </Card>
      <div className="space-y-2">
        {libros.length === 0 && <Empty>Sin libros cargados.</Empty>}
        {libros.map((l) => (
          <Card key={l.id} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium">{l.nombre}</div>
              {l.clasificacion && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{l.clasificacion}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => cambiarEstado(l)}>
                <Badge tone={l.estado === "finalizado" ? "ok" : l.estado === "en_curso" ? "warn" : "muted"}>
                  {l.estado === "en_curso" ? "en curso" : l.estado}
                </Badge>
              </button>
              <button onClick={() => borrar(l.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo libro">
        <div className="space-y-3">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Estado"><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="finalizado">Finalizado</option></Select></Field>
          <Field label="Clasificación"><Input value={form.clasificacion} onChange={(e) => setForm({ ...form, clasificacion: e.target.value })} placeholder="Ej: Ensayo, Novela" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio"><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></Field>
            <Field label="Fin"><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></Field>
          </div>
          <Field label="Observaciones"><Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardar}>Guardar</Button>
        </div>
      </Sheet>
    </div>
  );
}
