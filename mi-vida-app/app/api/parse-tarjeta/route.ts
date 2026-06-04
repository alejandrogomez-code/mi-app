import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Sos un parser de resúmenes de tarjeta de crédito argentinos (Naranja X y Visa).
Te paso un resumen (PDF o foto). Extraé TODOS los consumos del detalle.

Reglas:
- Importes en formato argentino: "164.145,40" = 164145.40. Convertí a número decimal con punto.
- El campo plan/cuota puede ser: "01" (un pago), "03/03" (cuota 3 de 3), "Deb.Aut." (débito automático), "Zeta"/"Z" (Plan Z cero interés).
  - Para "NN/MM": cuota_actual=NN, cuotas_total=MM.
  - Para "01" o "Deb.Aut.": cuota_actual=1, cuotas_total=1.
- Moneda: si la línea tiene importe en U$S/USD, moneda="USD" y poné importe_usd. Igual poné importe_ars si está el peso. Si solo hay pesos, moneda="ARS".
- comercio: el texto del comercio tal cual. comercio_limpio: sacale prefijos de pasarela (MERPAGO*, PAGOTIC -, etc.) y dejá el comercio real.
- es_gravado: true si el número de cupón o la línea tiene un asterisco (*).
- Cargos como IVA, impuesto de sellos, comisión de mantenimiento: incluilos con comercio="Impuestos/Comisiones" y categoria_sugerida="Impuestos".
- categoria_sugerida: una de [Supermercado, Comida, Transporte, Salud, Deporte, Ropa, Servicios, Casa, Ocio, Tecnología, Viajes, Impuestos, Otros].
- fecha en formato YYYY-MM-DD (asumí el año del resumen).

Devolvé SOLO JSON válido, sin markdown ni texto extra, con esta forma:
{
  "emisor": "Naranja X" | "Visa",
  "total": <numero>,
  "vencimiento": "YYYY-MM-DD" | null,
  "cierre": "YYYY-MM-DD" | null,
  "consumos": [
    {
      "fecha": "YYYY-MM-DD",
      "comercio": "...",
      "comercio_limpio": "...",
      "importe_total": <numero>,
      "importe_ars": <numero|null>,
      "importe_usd": <numero|null>,
      "moneda": "ARS"|"USD",
      "cuota_actual": <int>,
      "cuotas_total": <int>,
      "plan": "01"|"03/03"|"Zeta"|"Deb.Aut.",
      "es_gravado": <bool>,
      "categoria_sugerida": "..."
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { pdfBase64, imageBase64, mediaType } = await req.json();
    const content: any[] = [];

    if (pdfBase64) {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } });
    } else if (imageBase64) {
      content.push({ type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: imageBase64 } });
    } else {
      return NextResponse.json({ error: "Falta PDF o imagen" }, { status: 400 });
    }
    content.push({ type: "text", text: PROMPT });

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content }],
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
    return NextResponse.json({ error: e?.message ?? "Error al parsear" }, { status: 500 });
  }
}
