"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatARS, formatUSD, formatFecha, nombreMes, parseAR } from "@/lib/format";
import { generarCuotas } from "@/lib/calc";
import { Card, Button, Field, Input, Select, Sheet, Empty, StatTile, SectionTitle, Badge } from "@/components/ui";
import { MoneyInput } from "@/components/ui/MoneyInput";

type Tarjeta = { id: string; nombre: string; emisor: string | null };
type Cat = { id: string; nombre: string };
type Consumo = {
  id: string; tarjeta_id: string; comercio: string | null; comercio_limpio: string | null;
  importe_ars: number | null; importe_usd: number | null; moneda: string;
  cuota_actual: number; cuotas_total: number; plan: string | null; mes_impacto: string | null;
  estado: string; categoria_id: string | null; fecha: string | null; es_gravado: boolean;
};

export default function TarjetasPage() {
  const supabase = createClient();
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [tarjetaSel, setTarjetaSel] = useState<string>("");
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [openTar, setOpenTar] = useState(false);
  const [editConsumo, setEditConsumo] = useState<Consumo | null>(null);
  const [cForm, setCForm] = useState({ comercio_limpio: "", importe_ars: "", importe_usd: "", categoria_id: "", estado: "pendiente" });
  const [tarForm, setTarForm] = useState({ nombre: "", emisor: "Naranja X" });
  const [parseando, setParseando] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [parseInfo, setParseInfo] = useState<any>(null);

  const load = useCallback(async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("tarjetas").select("*").order("created_at"),
      supabase.from("categorias").select("id, nombre").eq("ambito", "tarjeta"),
    ]);
    setTarjetas(t ?? []); setCats(c ?? []);
    if (t && t.length && !tarjetaSel) setTarjetaSel(t[0].id);
  }, [supabase, tarjetaSel]);
  useEffect(() => { load(); }, [load]);

  const loadConsumos = useCallback(async () => {
    if (!tarjetaSel) { setConsumos([]); return; }
    const { data } = await supabase.from("consumos_tarjeta").select("*").eq("tarjeta_id", tarjetaSel).order("mes_impacto").order("fecha");
    setConsumos(data ?? []);
  }, [tarjetaSel, supabase]);
  useEffect(() => { loadConsumos(); }, [loadConsumos]);

  async function crearTarjeta() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tarForm.nombre) return;
    const { data } = await supabase.from("tarjetas").insert({ user_id: user.id, nombre: tarForm.nombre, emisor: tarForm.emisor }).select().single();
    setTarForm({ nombre: "", emisor: "Naranja X" }); setOpenTar(false);
    await load(); if (data) setTarjetaSel(data.id);
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(f);
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !tarjetaSel) return;
    setParseando(true); setPreview(null); setParseInfo(null);
    try {
      const b64 = await fileToBase64(f);
      const body = f.type === "application/pdf" ? { pdfBase64: b64 } : { imageBase64: b64, mediaType: f.type };
      const r = await fetch("/api/parse-tarjeta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.error) { alert("Error: " + j.error); return; }
      // sugerir categoría_id a partir del nombre
      const withCat = (j.consumos ?? []).map((c: any) => ({
        ...c, categoria_id: cats.find((cat) => cat.nombre === c.categoria_sugerida)?.id ?? null, incluir: true,
      }));
      setPreview(withCat);
      setParseInfo({ emisor: j.emisor, total: j.total, vencimiento: j.vencimiento, cierre: j.cierre });
    } finally { setParseando(false); e.target.value = ""; }
  }

  async function confirmarImport() {
    if (!preview || !tarjetaSel) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows: any[] = [];
    for (const c of preview.filter((x) => x.incluir)) {
      const grupo = crypto.randomUUID();
      const baseFecha = c.fecha || new Date().toISOString().slice(0, 10);
      if (c.cuotas_total > 1) {
        // Una fila por cuota con su mes de impacto
        const importeCuota = c.moneda === "USD" ? (c.importe_usd ?? 0) : (c.importe_ars ?? c.importe_total ?? 0);
        const cuotas = generarCuotas({ fechaCompra: baseFecha, cuotasTotal: c.cuotas_total, importeCuota, mesPrimerImpacto: baseFecha.slice(0, 7) });
        // Ajustar: la cuota_actual del resumen indica cuál se está pagando ahora
        cuotas.forEach((q) => {
          rows.push({
            user_id: user.id, tarjeta_id: tarjetaSel, grupo_id: grupo, fecha: baseFecha,
            comercio: c.comercio, comercio_limpio: c.comercio_limpio, importe_total: c.importe_total,
            importe_ars: c.moneda === "ARS" ? importeCuota : null, importe_usd: c.moneda === "USD" ? importeCuota : null,
            moneda: c.moneda, cuotas_total: c.cuotas_total, cuota_actual: q.cuota_actual, importe_cuota: importeCuota,
            mes_impacto: q.mes_impacto, plan: c.plan, categoria_id: c.categoria_id, estado: "pendiente", es_gravado: c.es_gravado,
          });
        });
      } else {
        rows.push({
          user_id: user.id, tarjeta_id: tarjetaSel, grupo_id: grupo, fecha: baseFecha,
          comercio: c.comercio, comercio_limpio: c.comercio_limpio, importe_total: c.importe_total,
          importe_ars: c.importe_ars, importe_usd: c.importe_usd, moneda: c.moneda,
          cuotas_total: 1, cuota_actual: 1, importe_cuota: c.importe_ars ?? c.importe_total,
          mes_impacto: baseFecha.slice(0, 7), plan: c.plan, categoria_id: c.categoria_id, estado: "pendiente", es_gravado: c.es_gravado,
        });
      }
    }
    if (rows.length) await supabase.from("consumos_tarjeta").insert(rows);
    setPreview(null); setParseInfo(null); loadConsumos();
  }

  async function toggleEstado(e: React.MouseEvent, c: Consumo) {
    e.stopPropagation();
    await supabase.from("consumos_tarjeta").update({ estado: c.estado === "pendiente" ? "pagado" : "pendiente" }).eq("id", c.id);
    loadConsumos();
  }
  async function borrar(e: React.MouseEvent, id: string) { e.stopPropagation(); await supabase.from("consumos_tarjeta").delete().eq("id", id); loadConsumos(); }

  function abrirEdicionConsumo(c: Consumo) {
    setEditConsumo(c);
    setCForm({
      comercio_limpio: c.comercio_limpio || c.comercio || "",
      importe_ars: c.importe_ars != null ? String(c.importe_ars) : "",
      importe_usd: c.importe_usd != null ? String(c.importe_usd) : "",
      categoria_id: c.categoria_id ?? "",
      estado: c.estado,
    });
  }
  async function guardarConsumo() {
    if (!editConsumo) return;
    await supabase.from("consumos_tarjeta").update({
      comercio_limpio: cForm.comercio_limpio,
      importe_ars: cForm.importe_ars ? parseAR(cForm.importe_ars) : null,
      importe_usd: cForm.importe_usd ? parseAR(cForm.importe_usd) : null,
      categoria_id: cForm.categoria_id || null,
      estado: cForm.estado,
    }).eq("id", editConsumo.id);
    setEditConsumo(null); loadConsumos();
  }

  // Proyección por mes de impacto
  const porMes = (() => {
    const map: Record<string, { ars: number; usd: number }> = {};
    consumos.forEach((c) => {
      const m = c.mes_impacto ?? "—";
      map[m] = map[m] ?? { ars: 0, usd: 0 };
      map[m].ars += c.importe_ars ?? 0;
      map[m].usd += c.importe_usd ?? 0;
    });
    return Object.entries(map).sort();
  })();

  const totalARS = consumos.reduce((a, c) => a + (c.importe_ars ?? 0), 0);
  const totalUSD = consumos.reduce((a, c) => a + (c.importe_usd ?? 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="font-display text-3xl font-semibold">Tarjetas</h1>
        <Button variant="ghost" onClick={() => setOpenTar(true)}>+ Tarjeta</Button>
      </header>

      {tarjetas.length === 0 ? <Empty>Creá tu primera tarjeta para empezar.</Empty> : (
        <>
          <Select value={tarjetaSel} onChange={(e) => setTarjetaSel(e.target.value)}>
            {tarjetas.map((t) => <option key={t.id} value={t.id}>{t.nombre}{t.emisor ? ` · ${t.emisor}` : ""}</option>)}
          </Select>

          <Card className="space-y-3">
            <h3 className="font-display text-lg font-semibold">✨ Importar resumen</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Subí el PDF (Naranja X) o foto (Visa). La IA detecta consumos, cuotas y USD.</p>
            <label className="block">
              <input type="file" accept="application/pdf,image/*" onChange={onFile} className="hidden" disabled={parseando} />
              <span className="flex cursor-pointer items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff", opacity: parseando ? 0.6 : 1 }}>
                {parseando ? "Analizando…" : "Subir PDF / foto"}
              </span>
            </label>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Total ARS" value={formatARS(totalARS)} />
            <StatTile label="Total USD" value={formatUSD(totalUSD)} tone="accent" />
          </div>

          {porMes.length > 0 && (
            <Card>
              <h3 className="mb-3 font-display text-lg font-semibold">Proyección por mes</h3>
              <div className="space-y-2">
                {porMes.map(([m, v]) => (
                  <div key={m} className="flex justify-between text-sm">
                    <span>{m === "—" ? "Sin mes" : nombreMes(m)}</span>
                    <span className="font-semibold">{formatARS(v.ars)}{v.usd ? ` · ${formatUSD(v.usd)}` : ""}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <SectionTitle>Consumos</SectionTitle>
          <div className="space-y-2">
            {consumos.length === 0 && <Empty>Sin consumos. Importá un resumen.</Empty>}
            {consumos.map((c) => (
              <Card key={c.id} className="flex items-center justify-between cursor-pointer">
                <div className="flex-1" onClick={() => abrirEdicionConsumo(c)}>
                  <div className="text-sm font-medium">{c.comercio_limpio || c.comercio}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatFecha(c.fecha)}
                    {c.cuotas_total > 1 ? ` · cuota ${c.cuota_actual}/${c.cuotas_total}` : ""}
                    {c.mes_impacto ? ` · ${nombreMes(c.mes_impacto)}` : ""}
                    {cats.find((x) => x.id === c.categoria_id) ? ` · ${cats.find((x) => x.id === c.categoria_id)!.nombre}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {c.moneda === "USD" && c.importe_usd ? <div className="text-sm font-semibold">{formatUSD(c.importe_usd)}</div> : null}
                    {c.importe_ars ? <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatARS(c.importe_ars)}</div> : null}
                  </div>
                  <button onClick={(e) => toggleEstado(e, c)}>
                    <Badge tone={c.estado === "pagado" ? "ok" : "warn"}>{c.estado}</Badge>
                  </button>
                  <button onClick={(e) => borrar(e, c.id)} style={{ color: "var(--text-muted)" }}>🗑</button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!editConsumo} onClose={() => setEditConsumo(null)} title="Editar consumo">
        <div className="space-y-3">
          <Field label="Comercio"><Input value={cForm.comercio_limpio} onChange={(e) => setCForm({ ...cForm, comercio_limpio: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Importe ARS"><MoneyInput value={cForm.importe_ars ? parseAR(cForm.importe_ars) : 0} onChangeValue={(n) => setCForm({ ...cForm, importe_ars: String(n) })} /></Field>
            <Field label="Importe USD"><Input type="number" value={cForm.importe_usd} onChange={(e) => setCForm({ ...cForm, importe_usd: e.target.value })} /></Field>
          </div>
          <Field label="Categoría"><Select value={cForm.categoria_id} onChange={(e) => setCForm({ ...cForm, categoria_id: e.target.value })}><option value="">Sin categoría</option>{cats.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}</Select></Field>
          <Field label="Estado"><Select value={cForm.estado} onChange={(e) => setCForm({ ...cForm, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></Select></Field>
          <Button className="w-full" onClick={guardarConsumo}>Guardar cambios</Button>
        </div>
      </Sheet>

      <Sheet open={openTar} onClose={() => setOpenTar(false)} title="Nueva tarjeta">
        <div className="space-y-3">
          <Field label="Nombre"><Input value={tarForm.nombre} onChange={(e) => setTarForm({ ...tarForm, nombre: e.target.value })} placeholder="Ej: Naranja X" /></Field>
          <Field label="Emisor"><Select value={tarForm.emisor} onChange={(e) => setTarForm({ ...tarForm, emisor: e.target.value })}><option>Naranja X</option><option>Visa</option><option>Mastercard</option><option>Otro</option></Select></Field>
          <Button className="w-full" onClick={crearTarjeta}>Crear</Button>
        </div>
      </Sheet>

      {/* Preview de import con edición */}
      <Sheet open={!!preview} onClose={() => { setPreview(null); setParseInfo(null); }} title="Revisar import">
        {parseInfo && (
          <div className="mb-3 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Emisor</span><b>{parseInfo.emisor}</b></div>
            {parseInfo.total != null && <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Total</span><b>{formatARS(parseInfo.total)}</b></div>}
            {parseInfo.vencimiento && <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Vence</span><b>{formatFecha(parseInfo.vencimiento)}</b></div>}
          </div>
        )}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {(preview ?? []).map((c, i) => (
            <div key={i} className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)", opacity: c.incluir ? 1 : 0.4 }}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={c.incluir} onChange={(e) => setPreview((p) => p!.map((x, j) => j === i ? { ...x, incluir: e.target.checked } : x))} />
                  {c.comercio_limpio || c.comercio}
                </label>
                <span className="text-sm font-semibold">{c.moneda === "USD" ? formatUSD(c.importe_usd ?? 0) : formatARS(c.importe_ars ?? c.importe_total ?? 0)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatFecha(c.fecha)} · {c.cuotas_total > 1 ? `${c.cuota_actual}/${c.cuotas_total}` : c.plan}</span>
                <select value={c.categoria_id ?? ""} onChange={(e) => setPreview((p) => p!.map((x, j) => j === i ? { ...x, categoria_id: e.target.value || null } : x))}
                  className="ml-auto rounded-lg border bg-surface px-2 py-1 text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                  <option value="">Sin cat.</option>
                  {cats.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={confirmarImport}>Importar {preview?.filter((x) => x.incluir).length ?? 0} consumos</Button>
      </Sheet>
    </div>
  );
}
