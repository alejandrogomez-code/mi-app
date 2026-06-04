// Formato argentino: punto miles, coma decimal, negativos entre paréntesis.
export function formatARS(n: number | null | undefined, opts?: { paren?: boolean }): string {
  const v = Number(n ?? 0);
  const abs = Math.abs(v);
  const s = abs.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (v < 0 && opts?.paren) return `($ ${s})`;
  return `${v < 0 ? "-" : ""}$ ${s}`;
}

export function formatUSD(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `US$ ${v.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNum(n: number | null | undefined, dec = 0): string {
  return Number(n ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

// 'YYYY-MM-DD' -> 'DD/MM/YY'
export function formatFecha(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

export function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nombreMes(ym: string): string {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const [y, m] = ym.split("-").map(Number);
  return `${meses[m - 1]} ${y}`;
}

// Parsea "164.145,40" (formato AR) a number 164145.40
export function parseAR(s: string): number {
  if (!s) return 0;
  const clean = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}
