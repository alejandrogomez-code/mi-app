"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFecha } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Select, Sheet, Badge, Empty, StatTile } from "@/components/ui";

type Partido = { id: string; fecha: string | null; contrincante: string | null; torneo: string | null; resultado: string | null; estado: string; observaciones: string | null };

const vacio = () => ({ fecha: new Date().toISOString().slice(0,10), contrincante: "", torneo: "", resultado: "", estado: "pendiente", observaciones: "" });

export default function TenisPage() {
  const supabase = createClient();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(vacio());

  const load = useCallback(async () => {
    const { data } = await supabase.from("partidos_tenis").select("*").order("fecha", { ascending: false });
    setPartidos(data ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  function abrirNuevo() { setEditId(null); setForm(vacio()); setOpen(true); }
  function abrirEdicion(p: Partido) {
    setEditId(p.id);
    setForm({ fecha: p.fecha ?? new Date().toISOString().slice(0,10), contrincante: p.contrincante ?? "", torneo: p.torneo ?? "", resultado: p.resultado ?? "", estado: p.estado, observaciones: p.observaciones ?? "" });
    setOpen(true);
  }

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { fecha: form.fecha || null, contrincante: form.contrincante, torneo: form.torneo, resultado: form.resultado, estado: form.estado, observaciones: form.observaciones };
    if (editId) await supabase.from("partidos_tenis").update(payload).eq("id", editId);
    else await supabase.from("partidos_tenis").insert({ user_id: user.id, ...payload });
    setForm(vacio()); setEditId(null); setOpen(false); load();
  }
  async function borrar(e: React.MouseEvent, id: string) { e.stopPropagation(); await supabase.from("partidos_tenis").delete().eq("id", id); load(); }

  const jugados = partidos.filter((p) => p.estado !== "pendiente").length;
  const ganados = partidos.filter((p) => p.estado === "ganado").length;
  const perdidos = partidos.filter((p) => p.estado === "perdido").length;
  const efectividad = jugados ? Math.round((ganados / jugados) * 100) : 0;

  const filtrados = partidos.filter((p) => filtro === "todos" || p.estado === filtro);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Tenis</h1>
        <Button onClick={abrirNuevo}>+ Partido</Button>
      </header>
      <div className="grid grid-cols-4 gap-2">
        <StatTile label="Jugados" value={`${jugados}`} />
        <StatTile label="Ganados" value={`${ganados}`} tone="ok" />
        <StatTile label="Perdidos" value={`${perdidos}`} tone="danger" />
        <StatTile label="Efect." value={`${efectividad}%`} tone="accent" />
      </div>
      <div className="flex gap-1.5">
        {["todos", "pendiente", "ganado", "perdido"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize"
            style={{ background: filtro === f ? "var(--accent)" : "var(--surface-2)", color: filtro === f ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>{f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtrados.length === 0 && <Empty>Sin partidos.</Empty>}
        {filtrados.map((p) => (
          <Card key={p.id} className="flex items-center justify-between cursor-pointer">
            <div className="flex-1" onClick={() => abrirEdicion(p)}>
              <div className="text-sm font-medium">{p.contrincante || "—"} {p.resultado ? `· ${p.resultado}` : ""}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{p.torneo || "Amistoso"} · {formatFecha(p.fecha)}</div>
              {p.observaciones && <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{p.observaciones}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={p.estado === "ganado" ? "ok" : p.estado === "perdido" ? "danger" : "muted"}>{p.estado}</Badge>
              <button onClick={(e) => borrar(e, p.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? "Editar partido" : "Nuevo partido"}>
        <div className="space-y-3">
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Contrincante"><Input value={form.contrincante} onChange={(e) => setForm({ ...form, contrincante: e.target.value })} /></Field>
          <Field label="Torneo"><Input value={form.torneo} onChange={(e) => setForm({ ...form, torneo: e.target.value })} placeholder="Ej: Liga, amistoso" /></Field>
          <Field label="Resultado"><Input value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} placeholder="Ej: 6-3 6-4" /></Field>
          <Field label="Estado"><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="ganado">Ganado</option><option value="perdido">Perdido</option></Select></Field>
          <Field label="Observaciones"><Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardar}>{editId ? "Guardar cambios" : "Guardar"}</Button>
        </div>
      </Sheet>
    </div>
  );
}
