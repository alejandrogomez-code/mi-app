import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Body: { tipo, duracion_min?, pasos?, peso?, observaciones? }
export async function POST(req: NextRequest) {
  try {
    const { tipo, duracion_min, pasos, peso, observaciones } = await req.json();
    if (!tipo && !duracion_min && !pasos) {
      return NextResponse.json({ error: "Faltan datos de la actividad" }, { status: 400 });
    }

    const detalle = [
      `Tipo de actividad: ${tipo || "no especificado"}.`,
      duracion_min ? `Duración: ${duracion_min} minutos.` : "",
      pasos ? `Pasos: ${pasos}.` : "",
      peso ? `Peso de la persona: ${peso} kg.` : "Peso de la persona: asumí 75 kg si no se indica.",
      observaciones ? `Notas: ${observaciones}.` : "",
    ].filter(Boolean).join(" ");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{
        role: "user",
        content:
          `Estimá las calorías gastadas en esta sesión de ejercicio. ${detalle} ` +
          `Usá valores MET estándar según el tipo e intensidad. Si hay pasos pero no duración, estimá. ` +
          `Respondé SOLO con un JSON válido, sin markdown ni texto extra, con esta forma exacta: ` +
          `{"calorias": <numero entero>, "detalle": "<breve explicación del cálculo>"}`,
      }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch { parsed = { calorias: null, detalle: text.slice(0, 200) }; }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
