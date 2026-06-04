"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNum } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Select, Sheet, Empty, StatTile } from "@/components/ui";

type Comida = {
  id: string; fecha: string; tipo_comida: string; descripcion: string | null;
  foto_url: string | null; calorias_est: number | null; calorias_corregidas: number | null;
};

const TIPOS = [
  { v: "desayuno", l: "Desayuno" }, { v: "colacion", l: "Colación" },
  { v: "almuerzo", l: "Almuerzo" }, { v: "merienda", l: "Merienda" },
  { v: "cena", l: "Cena" }, { v: "colacion_nocturna", l: "Colación nocturna" },
];

export default function ComidaPage() {
  const supabase = createClient();
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo_comida: "almuerzo", descripcion: "", calorias_est: "", calorias_corregidas: "" });
  const [file, setFile] = useState<File | null>(null);
  const [estimando, setEstimando] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("comidas").select("*").eq("fecha", fecha).order("created_at");
    setComidas(data ?? []);
  }, [fecha, supabase]);

  useEffect(() => { load(); }, [load]);

  async function fileToBase64(f: File): Promise<{ data: string; mediaType: string }> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res({ data: (r.result as string).split(",")[1], mediaType: f.type });
      r.onerror = rej; r.readAsDataURL(f);
    });
  }

  async function estimar() {
    setEstimando(true);
    try {
      let body: any = { descripcion: form.descripcion };
      if (file) { const { data, mediaType } = await fileToBase64(file); body = { ...body, imageBase64: data, mediaType }; }
      const r = await fetch("/api/estimar-calorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.calorias != null) setForm((f) => ({ ...f, calorias_est: String(j.calorias), descripcion: f.descripcion || j.detalle || "" }));
    } finally { setEstimando(false); }
  }

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let foto_url: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("comidas").upload(path, file);
      if (!error) foto_url = path;
    }
    await supabase.from("comidas").insert({
      user_id: user.id, fecha, tipo_comida: form.tipo_comida, descripcion: form.descripcion,
      foto_url, calorias_est: form.calorias_est ? parseFloat(form.calorias_est) : null,
      calorias_corregidas: form.calorias_corregidas ? parseFloat(form.calorias_corregidas) : null,
    });
    setForm({ tipo_comida: "almuerzo", descripcion: "", calorias_est: "", calorias_corregidas: "" });
    setFile(null); setOpen(false); load();
  }

  async function borrar(id: string) { await supabase.from("comidas").delete().eq("id", id); load(); }

  const total = comidas.reduce((a, c) => a + (c.calorias_corregidas ?? c.calorias_est ?? 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Comida</h1>
        <Button onClick={() => setOpen(true)}>+ Cargar</Button>
      </header>

      <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <StatTile label="Total del día" value={`${formatNum(total)} kcal`} tone="accent" />

      <div className="space-y-2">
        {comidas.length === 0 && <Empty>Sin comidas registradas este día.</Empty>}
        {comidas.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{TIPOS.find((t) => t.v === c.tipo_comida)?.l}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{c.descripcion || "—"}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">{formatNum(c.calorias_corregidas ?? c.calorias_est ?? 0)} kcal</span>
              <button onClick={() => borrar(c.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Cargar comida">
        <div className="space-y-3">
          <Field label="Tipo"><Select value={form.tipo_comida} onChange={(e) => setForm({ ...form, tipo_comida: e.target.value })}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</Select></Field>
          <Field label="Descripción"><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: milanesa con puré y ensalada" /></Field>
          <Field label="Foto (opcional)"><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Button variant="soft" className="w-full" onClick={estimar} disabled={estimando || (!form.descripcion && !file)}>
            {estimando ? "Estimando…" : "✨ Estimar calorías con IA"}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorías estimadas"><Input type="number" value={form.calorias_est} onChange={(e) => setForm({ ...form, calorias_est: e.target.value })} /></Field>
            <Field label="Corrección manual"><Input type="number" value={form.calorias_corregidas} onChange={(e) => setForm({ ...form, calorias_corregidas: e.target.value })} /></Field>
          </div>
          <Button className="w-full" onClick={guardar}>Guardar</Button>
        </div>
      </Sheet>
    </div>
  );
}
