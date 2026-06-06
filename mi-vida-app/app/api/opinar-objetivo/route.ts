import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Body: { pesoActual, pesoObjetivo, fechaObjetivo, altura, edad, sexo, nivel }
export async function POST(req: NextRequest) {
  try {
    const { pesoActual, pesoObjetivo, fechaObjetivo, altura, edad, sexo, nivel } = await req.json();
    if (!pesoActual || !pesoObjetivo || !fechaObjetivo) {
      return NextResponse.json({ error: "Faltan datos del objetivo" }, { status: 400 });
    }

    const prompt =
      `Sos un asesor de salud y fitness. Una persona quiere pasar de ${pesoActual} kg a ${pesoObjetivo} kg ` +
      `para la fecha ${fechaObjetivo}. Datos: altura ${altura || "?"} cm, edad ${edad || "?"}, sexo ${sexo === "F" ? "femenino" : "masculino"}, ` +
      `nivel de actividad actual: ${nivel || "ligero"}. Hoy es ${new Date().toISOString().slice(0, 10)}.\n\n` +
      `Analizá si el objetivo y el plazo son saludables y realistas (un ritmo seguro es 0,25 a 0,9 kg por semana). ` +
      `Si el plazo es muy agresivo o muy laxo, sugerí una fecha alternativa mejor. ` +
      `Proponé un plan semanal concreto de actividad física usando estas categorías: ` +
      `sesiones de gimnasio por semana, partidos de tenis por semana, y pasos diarios objetivo. ` +
      `También las calorías diarias a ingerir.\n\n` +
      `Respondé SOLO con un JSON válido, sin markdown ni texto extra, con esta forma exacta:\n` +
      `{\n` +
      `  "veredicto": "realista" | "agresivo" | "muy_laxo",\n` +
      `  "opinion": "<2-3 frases con tu análisis del objetivo y el plazo>",\n` +
      `  "fecha_sugerida": "YYYY-MM-DD o null si la fecha está bien",\n` +
      `  "calorias_diarias": <numero entero>,\n` +
      `  "plan_actividad": {\n` +
      `    "gym_por_semana": <entero>,\n` +
      `    "tenis_por_semana": <entero>,\n` +
      `    "pasos_diarios": <entero>,\n` +
      `    "detalle": "<1-2 frases explicando el plan de actividad>"\n` +
      `  },\n` +
      `  "alternativas": ["<alternativa 1>", "<alternativa 2>"]\n` +
      `}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
