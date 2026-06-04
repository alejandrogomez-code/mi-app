import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Body: { descripcion?: string, imageBase64?: string, mediaType?: string }
export async function POST(req: NextRequest) {
  try {
    const { descripcion, imageBase64, mediaType } = await req.json();
    if (!descripcion && !imageBase64) {
      return NextResponse.json({ error: "Falta descripción o imagen" }, { status: 400 });
    }

    const content: any[] = [];
    if (imageBase64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
      });
    }
    content.push({
      type: "text",
      text:
        `Estimá las calorías de esta comida. ${descripcion ? `Descripción: "${descripcion}".` : "Analizá la foto."} ` +
        `Respondé SOLO con un JSON válido, sin markdown ni texto extra, con esta forma exacta: ` +
        `{"calorias": <numero entero>, "detalle": "<breve descripción de lo identificado>"}`,
    });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content }],
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
