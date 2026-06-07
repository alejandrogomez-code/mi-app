"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFecha, formatNum } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Select, Sheet, Empty, StatTile } from "@/components/ui";

type Act = { id: string; fecha: string; tipo: string; duracion_min: number | null; pasos: number | null; calorias_est: number | null; observaciones: string | null };

const TIPOS = ["gimnasio", "tenis", "caminata", "otro"];
const vacio = () => ({ fecha: new Date().toISOString().slice(0,10), tipo: "gimnasio", duracion_min: "", pasos: "", calorias_est: "", observaciones: "" });

function inicioSemana() {
  const d = new Date(); const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day); return d.toISOString().slice(0, 10);
}

export default function ActividadPage() {
  const supabase = createClient();
  const [acts, setActs] = useState<Act[]>([]);
  const [pesoPerfil, setPesoPerfil] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [estimando, setEstimando] = useState(false);
  const [form, setForm] = useState(vacio());

  const load = useCallback(async () => {
    const { data } = await supabase.from("habitos_actividad").select("*").order("fecha", { ascending: false }).limit(60);
    setActs(data ?? []);
    const { data: p } = await supabase.from("peso_registros").select("peso").order("fecha", { ascending: false }).limit(1);
    if (p && p.length) setPesoPerfil(p[0].peso);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  function abrirNuevo() { setEditId(null); setForm(vacio()); setOpen(true); }
  function abrirEdicion(a: Act) {
    setEditId(a.id);
    setForm({
      fecha: a.fecha, tipo: a.tipo,
      duracion_min: a.duracion_min != null ? String(a.duracion_min) : "",
      pasos: a.pasos != null ? String(a.pasos) : "",
      calorias_est: a.calorias_est != null ? String(a.calorias_est) : "",
      observaciones: a.observaciones ?? "",
    });
    setOpen(true);
  }

  async function estimar() {
    setEstimando(true);
    try {
      const r = await fetch("/api/estimar-calorias-actividad", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          duracion_min: form.duracion_min ? +form.duracion_min : null,
          pasos: form.pasos ? +form.pasos : null,
          peso: pesoPerfil,
          observaciones: form.observaciones,
        }),
      });
      const j = await r.json();
      if (j.calorias != null) setForm((f) => ({ ...f, calorias_est: String(j.calorias) }));
      else if (j.error) alert("Error: " + j.error);
    } finally { setEstimando(false); }
  }

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      fecha: form.fecha, tipo: form.tipo,
      duracion_min: form.duracion_min ? +form.duracion_min : null,
      pasos: form.pasos ? +form.pasos : null,
      calorias_est: form.calorias_est ? +form.calorias_est : null,
      observaciones: form.observaciones,
    };
    if (editId) await supabase.from("habitos_actividad").update(payload).eq("id", editId);
    else await supabase.from("habitos_actividad").insert({ user_id: user.id, ...payload });
    setForm(vacio()); setEditId(null); setOpen(false); load();
  }
  async function borrar(e: React.MouseEvent, id: string) { e.stopPropagation(); await supabase.from("habitos_actividad").delete().eq("id", id); load(); }

  const lunes = inicioSemana();
  const semana = acts.filter((a) => a.fecha >= lunes);
  const pasos = semana.reduce((s, a) => s + (a.pasos ?? 0), 0);
  const cal = semana.reduce((s, a) => s + (a.calorias_est ?? 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Actividad</h1>
        <Button onClick={abrirNuevo}>+ Registrar</Button>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Sesiones" value={`${semana.length}`} sub="esta semana" />
        <StatTile label="Pasos" value={formatNum(pasos)} sub="semana" />
        <StatTile label="Calorías" value={formatNum(cal)} sub="gastadas" tone="accent" />
      </div>
      <div className="space-y-2">
        {acts.length === 0 && <Empty>Sin actividad registrada.</Empty>}
        {acts.map((a) => (
          <Card key={a.id} className="flex items-center justify-between cursor-pointer">
            <div className="flex-1" onClick={() => abrirEdicion(a)}>
              <div className="text-sm font-medium capitalize">{a.tipo}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatFecha(a.fecha)}{a.duracion_min ? ` · ${a.duracion_min} min` : ""}{a.pasos ? ` · ${formatNum(a.pasos)} pasos` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {a.calorias_est ? <span className="text-sm font-semibold">{formatNum(a.calorias_est)} kcal</span> : null}
              <button onClick={(e) => borrar(e, a.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={open} onClose={() => { setOpen(false); setEditId(null); }} title={editId ? "Editar actividad" : "Registrar actividad"}>
        <div className="space-y-3">
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Tipo"><Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (min)"><Input type="number" value={form.duracion_min} onChange={(e) => setForm({ ...form, duracion_min: e.target.value })} /></Field>
            <Field label="Pasos"><Input type="number" value={form.pasos} onChange={(e) => setForm({ ...form, pasos: e.target.value })} /></Field>
          </div>
          <Field label="Observaciones"><Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          <Button variant="soft" className="w-full" onClick={estimar} disabled={estimando || (!form.duracion_min && !form.pasos)}>
            {estimando ? "Estimando…" : "✨ Estimar calorías con IA"}
          </Button>
          <Field label="Calorías gastadas"><Input type="number" value={form.calorias_est} onChange={(e) => setForm({ ...form, calorias_est: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardar}>{editId ? "Guardar cambios" : "Guardar"}</Button>
        </div>
      </Sheet>
    </div>
  );
}
