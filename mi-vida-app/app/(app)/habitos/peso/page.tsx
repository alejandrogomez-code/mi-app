"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcIMC, estadoIMC, tmb, gastoDiario, planPeso, NivelActividad } from "@/lib/calc";
import { formatFecha, formatNum } from "@/lib/format";
import { Card, Button, Field, Input, Select, Sheet, Badge, Empty, StatTile } from "@/components/ui";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type Reg = { id: string; fecha: string; peso: number; cintura: number | null; imc: number | null; estado: string | null };

export default function PesoPage() {
  const supabase = createClient();
  const [regs, setRegs] = useState<Reg[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [openObj, setOpenObj] = useState(false);
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0, 10), peso: "", cintura: "" });
  const [obj, setObj] = useState({ altura_cm: "", objetivo_peso: "", fecha_objetivo_peso: "", edad: "40", sexo: "M", nivel: "ligero" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("peso_registros").select("*").order("fecha", { ascending: true });
    setRegs(data ?? []);
    const { data: p } = await supabase.from("profiles").select("*").single();
    setProfile(p);
    if (p) setObj((o) => ({ ...o, altura_cm: p.altura_cm ?? "", objetivo_peso: p.objetivo_peso ?? "", fecha_objetivo_peso: p.fecha_objetivo_peso ?? "" }));
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.peso) return;
    const peso = parseFloat(form.peso);
    const imc = profile?.altura_cm ? calcIMC(peso, profile.altura_cm) : null;
    await supabase.from("peso_registros").insert({
      user_id: user.id, fecha: form.fecha, peso,
      cintura: form.cintura ? parseFloat(form.cintura) : null,
      imc, estado: estadoIMC(imc),
    });
    setForm({ fecha: new Date().toISOString().slice(0, 10), peso: "", cintura: "" });
    setOpen(false); load();
  }

  async function guardarObjetivo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({
      altura_cm: obj.altura_cm ? parseFloat(obj.altura_cm) : null,
      objetivo_peso: obj.objetivo_peso ? parseFloat(obj.objetivo_peso) : null,
      fecha_objetivo_peso: obj.fecha_objetivo_peso || null,
    }).eq("user_id", user.id);
    setOpenObj(false); load();
  }

  const ultimo = regs[regs.length - 1];
  const imcActual = ultimo?.imc ?? null;

  // Plan de calorías
  let plan: ReturnType<typeof planPeso> | null = null;
  if (ultimo && profile?.altura_cm && profile?.objetivo_peso && profile?.fecha_objetivo_peso) {
    const tmbVal = tmb(ultimo.peso, profile.altura_cm, parseInt(obj.edad || "40"), obj.sexo as "M" | "F");
    const gd = gastoDiario(tmbVal, obj.nivel as NivelActividad);
    plan = planPeso({ pesoActual: ultimo.peso, pesoObjetivo: profile.objetivo_peso, fechaObjetivo: profile.fecha_objetivo_peso, gastoDiarioVal: gd });
  }

  const chartData = regs.map((r) => ({ fecha: formatFecha(r.fecha), peso: r.peso }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Peso</h1>
        <Button onClick={() => setOpen(true)}>+ Registrar</Button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Peso actual" value={ultimo ? `${formatNum(ultimo.peso, 1)} kg` : "—"} />
        <StatTile label="IMC" value={imcActual ? `${imcActual}` : "—"} sub={ultimo?.estado ?? ""} tone={ultimo?.estado === "normal" ? "ok" : ultimo?.estado ? "warn" : undefined} />
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Evolución</h3>
          <Button variant="ghost" onClick={() => setOpenObj(true)}>Objetivo</Button>
        </div>
        {chartData.length < 2 ? <Empty>Cargá al menos 2 registros para ver la curva.</Empty> : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} />
              <Line type="monotone" dataKey="peso" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {plan && (
        <Card className="space-y-2" style={plan.agresivo ? { borderColor: "var(--warn)" } : undefined}>
          <h3 className="font-display text-lg font-semibold">Plan sugerido</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span style={{ color: "var(--text-muted)" }}>A perder: </span><b>{plan.kgPerder} kg</b></div>
            <div><span style={{ color: "var(--text-muted)" }}>Ritmo: </span><b>{plan.kgPorSemana} kg/sem</b></div>
            <div><span style={{ color: "var(--text-muted)" }}>Calorías/día: </span><b>{formatNum(plan.caloriasSugeridas)}</b></div>
            <div><span style={{ color: "var(--text-muted)" }}>Déficit: </span><b>{formatNum(plan.deficitDiario)}</b></div>
          </div>
          {plan.agresivo && <p className="text-sm" style={{ color: "var(--warn)" }}>⚠ El ritmo supera ~0,9 kg/semana. Considerá una fecha objetivo más holgada.</p>}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Valores orientativos, no son consejo médico. Consultá a un profesional.</p>
        </Card>
      )}

      <div className="space-y-2">
        {regs.length === 0 && <Empty>Sin registros de peso.</Empty>}
        {[...regs].reverse().map((r) => (
          <Card key={r.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{formatNum(r.peso, 1)} kg {r.cintura ? `· cintura ${formatNum(r.cintura, 0)} cm` : ""}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatFecha(r.fecha)} · IMC {r.imc ?? "—"}</div>
            </div>
            {r.estado && <Badge tone={r.estado === "normal" ? "ok" : "warn"}>{r.estado}</Badge>}
          </Card>
        ))}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Registrar peso">
        <div className="space-y-3">
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Peso (kg)"><Input type="number" inputMode="decimal" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></Field>
          <Field label="Cintura (cm)"><Input type="number" inputMode="decimal" value={form.cintura} onChange={(e) => setForm({ ...form, cintura: e.target.value })} /></Field>
          <Button className="w-full" onClick={guardar}>Guardar</Button>
        </div>
      </Sheet>

      <Sheet open={openObj} onClose={() => setOpenObj(false)} title="Objetivo de peso">
        <div className="space-y-3">
          <Field label="Altura (cm)"><Input type="number" value={obj.altura_cm} onChange={(e) => setObj({ ...obj, altura_cm: e.target.value })} /></Field>
          <Field label="Peso objetivo (kg)"><Input type="number" value={obj.objetivo_peso} onChange={(e) => setObj({ ...obj, objetivo_peso: e.target.value })} /></Field>
          <Field label="Fecha objetivo"><Input type="date" value={obj.fecha_objetivo_peso} onChange={(e) => setObj({ ...obj, fecha_objetivo_peso: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Edad"><Input type="number" value={obj.edad} onChange={(e) => setObj({ ...obj, edad: e.target.value })} /></Field>
            <Field label="Sexo"><Select value={obj.sexo} onChange={(e) => setObj({ ...obj, sexo: e.target.value })}><option value="M">Masculino</option><option value="F">Femenino</option></Select></Field>
          </div>
          <Field label="Nivel de actividad">
            <Select value={obj.nivel} onChange={(e) => setObj({ ...obj, nivel: e.target.value })}>
              <option value="sedentario">Sedentario</option>
              <option value="ligero">Ligero</option>
              <option value="moderado">Moderado</option>
              <option value="activo">Activo</option>
              <option value="muy_activo">Muy activo</option>
            </Select>
          </Field>
          <Button className="w-full" onClick={guardarObjetivo}>Guardar objetivo</Button>
        </div>
      </Sheet>
    </div>
  );
}
