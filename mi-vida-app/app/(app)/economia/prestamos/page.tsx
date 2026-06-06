"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatARS, formatFecha, parseAR } from "@/lib/format";
import { Card, Button, Field, Input, Textarea, Sheet, Empty, StatTile, SectionTitle, Badge } from "@/components/ui";
import { MoneyInput } from "@/components/ui/MoneyInput";

type Prestamo = { id: string; nombre: string; entidad: string | null; monto_original: number | null; cuotas_total: number | null; observaciones: string | null };
type Cuota = { id: string; prestamo_id: string; numero: number; vencimiento: string | null; capital: number; interes: number; otros: number; importe_total: number; estado: string };

export default function PrestamosPage() {
  const supabase = createClient();
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [openP, setOpenP] = useState(false);
  const [openC, setOpenC] = useState<string | null>(null);
  const [pForm, setPForm] = useState({ nombre: "", entidad: "", monto_original: "", cuotas_total: "", observaciones: "" });
  const [cForm, setCForm] = useState({ numero: "", vencimiento: "", capital: "", interes: "", otros: "" });

  const load = useCallback(async () => {
    const { data: p } = await supabase.from("prestamos").select("*").order("created_at");
    setPrestamos(p ?? []);
    const ids = (p ?? []).map((x) => x.id);
    if (ids.length) {
      const { data: c } = await supabase.from("cuotas_prestamo").select("*").in("prestamo_id", ids).order("numero");
      setCuotas(c ?? []);
    } else setCuotas([]);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function crearPrestamo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !pForm.nombre) return;
    await supabase.from("prestamos").insert({
      user_id: user.id, nombre: pForm.nombre, entidad: pForm.entidad,
      monto_original: pForm.monto_original ? parseFloat(pForm.monto_original) : null,
      cuotas_total: pForm.cuotas_total ? parseInt(pForm.cuotas_total) : null,
      observaciones: pForm.observaciones,
    });
    setPForm({ nombre: "", entidad: "", monto_original: "", cuotas_total: "", observaciones: "" });
    setOpenP(false); load();
  }

  async function crearCuota() {
    if (!openC) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const cap = parseFloat(cForm.capital) || 0, int = parseFloat(cForm.interes) || 0, otr = parseFloat(cForm.otros) || 0;
    await supabase.from("cuotas_prestamo").insert({
      user_id: user.id, prestamo_id: openC, numero: parseInt(cForm.numero) || 1,
      vencimiento: cForm.vencimiento || null, capital: cap, interes: int, otros: otr,
      importe_total: cap + int + otr, estado: "pendiente",
    });
    setCForm({ numero: "", vencimiento: "", capital: "", interes: "", otros: "" });
    setOpenC(null); load();
  }

  async function togglePago(c: Cuota) {
    await supabase.from("cuotas_prestamo").update({
      estado: c.estado === "pagada" ? "pendiente" : "pagada",
      fecha_pago: c.estado === "pagada" ? null : new Date().toISOString().slice(0, 10),
    }).eq("id", c.id); load();
  }
  async function borrarPrestamo(id: string) { await supabase.from("prestamos").delete().eq("id", id); load(); }

  const deudaPendiente = cuotas.filter((c) => c.estado === "pendiente").reduce((a, c) => a + c.importe_total, 0);
  const proximas = cuotas.filter((c) => c.estado === "pendiente" && c.vencimiento).sort((a, b) => (a.vencimiento! < b.vencimiento! ? -1 : 1)).slice(0, 5);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Préstamos</h1>
        <Button onClick={() => setOpenP(true)}>+ Préstamo</Button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Deuda pendiente" value={formatARS(deudaPendiente)} tone="danger" />
        <StatTile label="Préstamos" value={`${prestamos.length}`} />
      </div>

      {proximas.length > 0 && (
        <Card>
          <h3 className="mb-2 font-display text-lg font-semibold">Próximas cuotas</h3>
          <div className="space-y-2">
            {proximas.map((c) => {
              const p = prestamos.find((x) => x.id === c.prestamo_id);
              const vencido = c.vencimiento && c.vencimiento < new Date().toISOString().slice(0, 10);
              return (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{p?.nombre} · cuota {c.numero}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatARS(c.importe_total)}</span>
                    <Badge tone={vencido ? "danger" : "warn"}>{formatFecha(c.vencimiento)}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {prestamos.length === 0 && <Empty>Sin préstamos cargados.</Empty>}
      {prestamos.map((p) => {
        const cs = cuotas.filter((c) => c.prestamo_id === p.id);
        const pagadas = cs.filter((c) => c.estado === "pagada").length;
        return (
          <Card key={p.id} className="rise space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{p.nombre}</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.entidad}{p.monto_original ? ` · ${formatARS(p.monto_original)}` : ""}</p>
              </div>
              <Badge tone="muted">{pagadas}/{cs.length || p.cuotas_total || 0}</Badge>
            </div>
            <div className="space-y-1.5">
              {cs.map((c) => (
                <button key={c.id} onClick={() => togglePago(c)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm" style={{ borderColor: "var(--border)" }}>
                  <span>{c.estado === "pagada" ? "✅" : "⬜"} Cuota {c.numero} {c.vencimiento ? `· ${formatFecha(c.vencimiento)}` : ""}</span>
                  <span className="font-semibold">{formatARS(c.importe_total)}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => setOpenC(p.id)}>+ Cuota</Button>
              <Button variant="ghost" onClick={() => borrarPrestamo(p.id)}>🗑</Button>
            </div>
          </Card>
        );
      })}

      <Sheet open={openP} onClose={() => setOpenP(false)} title="Nuevo préstamo">
        <div className="space-y-3">
          <Field label="Nombre"><Input value={pForm.nombre} onChange={(e) => setPForm({ ...pForm, nombre: e.target.value })} placeholder="Ej: Préstamo Banco Macro" /></Field>
          <Field label="Entidad"><Input value={pForm.entidad} onChange={(e) => setPForm({ ...pForm, entidad: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto original"><MoneyInput value={pForm.monto_original ? parseAR(pForm.monto_original) : 0} onChangeValue={(n) => setPForm({ ...pForm, monto_original: String(n) })} /></Field>
            <Field label="Cuotas totales"><Input type="number" value={pForm.cuotas_total} onChange={(e) => setPForm({ ...pForm, cuotas_total: e.target.value })} /></Field>
          </div>
          <Field label="Observaciones"><Textarea value={pForm.observaciones} onChange={(e) => setPForm({ ...pForm, observaciones: e.target.value })} /></Field>
          <Button className="w-full" onClick={crearPrestamo}>Crear</Button>
        </div>
      </Sheet>

      <Sheet open={!!openC} onClose={() => setOpenC(null)} title="Nueva cuota">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número"><Input type="number" value={cForm.numero} onChange={(e) => setCForm({ ...cForm, numero: e.target.value })} /></Field>
            <Field label="Vencimiento"><Input type="date" value={cForm.vencimiento} onChange={(e) => setCForm({ ...cForm, vencimiento: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Capital"><MoneyInput value={cForm.capital ? parseAR(cForm.capital) : 0} onChangeValue={(n) => setCForm({ ...cForm, capital: String(n) })} /></Field>
            <Field label="Interés"><MoneyInput value={cForm.interes ? parseAR(cForm.interes) : 0} onChangeValue={(n) => setCForm({ ...cForm, interes: String(n) })} /></Field>
            <Field label="Otros"><MoneyInput value={cForm.otros ? parseAR(cForm.otros) : 0} onChangeValue={(n) => setCForm({ ...cForm, otros: String(n) })} /></Field>
          </div>
          <Button className="w-full" onClick={crearCuota}>Agregar cuota</Button>
        </div>
      </Sheet>
    </div>
  );
}
