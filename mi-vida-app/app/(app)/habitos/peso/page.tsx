"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcIMC, estadoIMC, tmb, gastoDiario, planPeso, NivelActividad } from "@/lib/calc";
import { formatFecha, formatNum } from "@/lib/format";
import { Card, Button, Field, Input, Select, Sheet, Badge, Empty, StatTile } from "@/components/ui";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type Reg = { id: string; fecha: string; peso: number; cintura: number | null; imc: number | null; estado: string | null };
type Opinion = {
  veredicto: string; opinion: string; fecha_sugerida: string | null;
  calorias_diarias: number;
  plan_actividad: { gym_por_semana: number; tenis_por_semana: number; pasos_diarios: number; detalle: string };
  alternativas: string[];
};

export default function PesoPage() {
  const supabase = createClient();
  const [regs, setRegs] = useState<Reg[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [openObj, setOpenObj] = useState(false);
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0, 10), peso: "", cintura: "" });
  const [obj, setObj] = useState({ altura_cm: "", objetivo_peso: "", fecha_objetivo_peso: "", edad: "40", sexo: "M", nivel: "ligero" });
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [opinando, setOpinando] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("peso_registros").select("*").order("fecha", { ascending: true });
    setRegs(data ?? []);
    const { data: p } = await supabase.from("profiles").select("*").single();
    setProfile(p);
    if (p) setObj((o) => ({
      ...o,
      altura_cm: p.altura_cm != null ? String(p.altura_cm) : "",
      objetivo_peso: p.objetivo_peso != null ? String(p.objetivo_peso) : "",
      fecha_objetivo_peso: p.fecha_objetivo_peso ?? "",
      edad: p.edad != null ? String(p.edad) : o.edad,
      sexo: p.sexo ?? o.sexo,
    }));
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Altura efectiva: la del perfil, o la tipeada en el sheet si todavía no se guardó.
  const altura: number | null = profile?.altura_cm ?? (obj.altura_cm ? parseFloat(obj.altura_cm) : null);

  // IMC AL VUELO: no depende de lo guardado. Si hay altura, siempre calcula.
  function imcDe(peso: number): number | null {
    return altura ? calcIMC(peso, altura) : null;
  }

  async function guardar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.peso) return;
    const peso = parseFloat(form.peso);
    const imc = altura ? calcIMC(peso, altura) : null;
    await supabase.from("peso_registros").insert({
      user_id: user.id, fecha: form.fecha, peso,
      cintura: form.cintura ? parseFloat(form.cintura) : null,
      imc, estado: imc ? estadoIMC(imc) : null,
    });
    setForm({ fecha: new Date().toISOString().slice(0, 10), peso: "", cintura: "" });
    setOpen(false); load();
  }

  async function guardarObjetivo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const alturaNum = obj.altura_cm ? parseFloat(obj.altura_cm) : null;
    const { error } = await supabase.from("profiles").update({
      altura_cm: alturaNum,
      objetivo_peso: obj.objetivo_peso ? parseFloat(obj.objetivo_peso) : null,
      fecha_objetivo_peso: obj.fecha_objetivo_peso || null,
      edad: obj.edad ? parseInt(obj.edad) : null,
      sexo: obj.sexo,
    }).eq("user_id", user.id);
    if (error) { alert("No se pudo guardar: " + error.message); return; }
    // Recalcula y persiste el IMC de todos los registros con la nueva altura.
    if (alturaNum) {
      for (const r of regs) {
        const imc = calcIMC(r.peso, alturaNum);
        await supabase.from("peso_registros").update({ imc, estado: imc ? estadoIMC(imc) : null }).eq("id", r.id);
      }
    }
    setOpenObj(false); load();
  }

  async function pedirOpinion() {
    if (!ultimo || !profile?.objetivo_peso || !profile?.fecha_objetivo_peso) {
      alert("Cargá primero tu altura, peso objetivo y fecha objetivo en el botón Objetivo.");
      return;
    }
    setOpinando(true); setOpinion(null);
    try {
      const r = await fetch("/api/opinar-objetivo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pesoActual: ultimo.peso, pesoObjetivo: profile.objetivo_peso,
          fechaObjetivo: profile.fecha_objetivo_peso, altura,
          edad: profile.edad ?? obj.edad, sexo: profile.sexo ?? obj.sexo, nivel: obj.nivel,
        }),
      });
      const j = await r.json();
      if (j.error) { alert("Error: " + j.error); return; }
      setOpinion(j);
    } finally { setOpinando(false); }
  }

  const ultimo = regs[regs.length - 1];
  const imcActual = ultimo ? imcDe(ultimo.peso) : null;
  const estadoActual = imcActual ? estadoIMC(imcActual) : null;
  const tieneObjetivo = profile?.altura_cm && profile?.objetivo_peso && profile?.fecha_objetivo_peso;

  let plan: ReturnType<typeof planPeso> | null = null;
  if (ultimo && tieneObjetivo) {
    const tmbVal = tmb(ultimo.peso, profile.altura_cm, parseInt(String(profile.edad || obj.edad || "40")), (profile.sexo || obj.sexo) as "M" | "F");
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
        <StatTile label="IMC" value={imcActual ? `${imcActual}` : "—"} sub={estadoActual ?? ""} tone={estadoActual === "normal" ? "ok" : estadoActual ? "warn" : undefined} />
      </div>

      {ultimo && imcActual == null && (
        <Card style={{ borderColor: "var(--warn)" }}>
          <p className="text-sm" style={{ color: "var(--warn)" }}>
            Para calcular el IMC necesito tu altura. Tocá <b>Objetivo</b> y cargala.
          </p>
        </Card>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Evolución</h3>
          <Button variant="ghost" onClick={() => setOpenObj(true)}>{tieneObjetivo ? "Editar objetivo" : "Objetivo"}</Button>
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
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Plan sugerido</h3>
            <Button variant="soft" onClick={pedirOpinion} disabled={opinando}>{opinando ? "Pensando…" : "✨ Opinión IA"}</Button>
          </div>
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

      {opinion && (
        <Card className="space-y-3" style={{ borderColor: "var(--accent)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">✨ Opinión IA</h3>
            <Badge tone={opinion.veredicto === "realista" ? "ok" : "warn"}>{opinion.veredicto.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm">{opinion.opinion}</p>

          {opinion.fecha_sugerida && (
            <p className="text-sm" style={{ color: "var(--warn)" }}>
              📅 Fecha sugerida más saludable: <b>{formatFecha(opinion.fecha_sugerida)}</b>
            </p>
          )}

          <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-2 text-sm font-semibold">Plan semanal de actividad</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-display text-2xl font-semibold">{opinion.plan_actividad.gym_por_semana}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>gym / sem</div>
              </div>
              <div>
                <div className="font-display text-2xl font-semibold">{opinion.plan_actividad.tenis_por_semana}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>tenis / sem</div>
              </div>
              <div>
                <div className="font-display text-2xl font-semibold">{formatNum(opinion.plan_actividad.pasos_diarios)}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>pasos / día</div>
              </div>
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{opinion.plan_actividad.detalle}</p>
          </div>

          <div className="text-sm">
            <span style={{ color: "var(--text-muted)" }}>Calorías diarias sugeridas: </span>
            <b>{formatNum(opinion.calorias_diarias)} kcal</b>
          </div>

          {opinion.alternativas?.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-semibold">Alternativas</div>
              <ul className="space-y-1">
                {opinion.alternativas.map((a, i) => (
                  <li key={i} className="text-sm" style={{ color: "var(--text-muted)" }}>• {a}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sugerencias orientativas de IA, no son consejo médico. Consultá a un profesional.</p>
        </Card>
      )}

      <div className="space-y-2">
        {regs.length === 0 && <Empty>Sin registros de peso.</Empty>}
        {[...regs].reverse().map((r) => {
          const imc = imcDe(r.peso);
          const est = imc ? estadoIMC(imc) : null;
          return (
            <Card key={r.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{formatNum(r.peso, 1)} kg {r.cintura ? `· cintura ${formatNum(r.cintura, 0)} cm` : ""}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatFecha(r.fecha)} · IMC {imc ?? "—"}</div>
              </div>
              {est && <Badge tone={est === "normal" ? "ok" : "warn"}>{est}</Badge>}
            </Card>
          );
        })}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Registrar peso">
        <div className="space-y-3">
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Peso (kg)"><Input type="number" inputMode="decimal" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></Field>
          <Field label="Cintura (cm)"><Input type="number" inputMode="decimal" value={form.cintura} onChange={(e) => setForm({ ...form, cintura: e.target.value })} /></Field>
          {!altura && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Tip: cargá tu altura en <b>Objetivo</b> para que se calcule el IMC.
            </p>
          )}
          <Button className="w-full" onClick={guardar}>Guardar</Button>
        </div>
      </Sheet>

      <Sheet open={openObj} onClose={() => setOpenObj(false)} title={tieneObjetivo ? "Editar objetivo" : "Objetivo de peso"}>
        <div className="space-y-3">
          <Field label="Altura (cm)"><Input type="number" inputMode="decimal" value={obj.altura_cm} onChange={(e) => setObj({ ...obj, altura_cm: e.target.value })} /></Field>
          <Field label="Peso objetivo (kg)"><Input type="number" inputMode="decimal" value={obj.objetivo_peso} onChange={(e) => setObj({ ...obj, objetivo_peso: e.target.value })} /></Field>
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
          <Button className="w-full" onClick={guardarObjetivo}>{tieneObjetivo ? "Guardar cambios" : "Guardar objetivo"}</Button>
        </div>
      </Sheet>
    </div>
  );
}
