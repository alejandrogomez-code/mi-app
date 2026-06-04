// ---------- IMC ----------
export function calcIMC(pesoKg: number, alturaCm: number): number | null {
  if (!pesoKg || !alturaCm) return null;
  const m = alturaCm / 100;
  return +(pesoKg / (m * m)).toFixed(1);
}

export function estadoIMC(imc: number | null): string {
  if (imc == null) return "";
  if (imc < 18.5) return "bajo";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  return "obesidad";
}

// ---------- Calorías (Mifflin-St Jeor) ----------
// Devuelve TMB. sexo: 'M' | 'F'
export function tmb(pesoKg: number, alturaCm: number, edad: number, sexo: "M" | "F"): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  return Math.round(sexo === "M" ? base + 5 : base - 161);
}

export type NivelActividad = "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo";
const FACTOR: Record<NivelActividad, number> = {
  sedentario: 1.2, ligero: 1.375, moderado: 1.55, activo: 1.725, muy_activo: 1.9,
};

export function gastoDiario(tmbVal: number, nivel: NivelActividad): number {
  return Math.round(tmbVal * FACTOR[nivel]);
}

// Plan de pérdida de peso. Devuelve sugerencia + alerta si es agresivo.
export function planPeso(args: {
  pesoActual: number; pesoObjetivo: number; fechaObjetivo: string;
  gastoDiarioVal: number;
}) {
  const { pesoActual, pesoObjetivo, fechaObjetivo, gastoDiarioVal } = args;
  const kgPerder = pesoActual - pesoObjetivo;
  const dias = Math.max(1, Math.ceil(
    (new Date(fechaObjetivo).getTime() - Date.now()) / 86400000
  ));
  const semanas = dias / 7;
  const kgPorSemana = kgPerder / semanas;
  // 1 kg grasa ~ 7700 kcal
  const deficitDiario = Math.round((kgPerder * 7700) / dias);
  const caloriasSugeridas = Math.max(1200, gastoDiarioVal - deficitDiario);
  const agresivo = kgPorSemana > 0.9;
  return {
    kgPerder: +kgPerder.toFixed(1),
    semanas: +semanas.toFixed(1),
    kgPorSemana: +kgPorSemana.toFixed(2),
    caloriasSugeridas,
    deficitDiario,
    agresivo,
    alcanzable: kgPorSemana <= 1.2 && caloriasSugeridas >= 1200,
  };
}

// ---------- Cuotas de tarjeta: genera N filas, una por mes ----------
export function generarCuotas(args: {
  fechaCompra: string;       // 'YYYY-MM-DD'
  cuotasTotal: number;
  importeCuota: number;
  mesPrimerImpacto?: string;  // 'YYYY-MM' opcional; si no, usa mes de compra+1
}) {
  const { cuotasTotal, importeCuota } = args;
  let [y, m] = (args.mesPrimerImpacto ?? add1Mes(args.fechaCompra.slice(0, 7)))
    .split("-").map(Number);
  const out: { cuota_actual: number; mes_impacto: string; importe_cuota: number }[] = [];
  for (let i = 1; i <= cuotasTotal; i++) {
    out.push({
      cuota_actual: i,
      mes_impacto: `${y}-${String(m).padStart(2, "0")}`,
      importe_cuota: importeCuota,
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function add1Mes(ym: string): string {
  let [y, m] = ym.split("-").map(Number);
  m++; if (m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
