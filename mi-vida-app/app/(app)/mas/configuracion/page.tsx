"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Field, Input, SectionTitle } from "@/components/ui";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";

const TABLAS = [
  "profiles", "objetivos", "metas_semanales", "evaluaciones_semanales",
  "habitos_actividad", "comidas", "peso_registros", "libros",
  "cuentas", "categorias", "movimientos", "saldos_mensuales",
  "tarjetas", "consumos_tarjeta", "prestamos", "cuotas_prestamo",
  "recordatorios", "partidos_tenis", "configuraciones_usuario",
];

export default function ConfiguracionPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [exportando, setExportando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").single();
      setProfile(data);
    })();
  }, [supabase]);

  async function guardarPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) return;
    await supabase.from("profiles").update({
      nombre: profile.nombre,
      altura_cm: profile.altura_cm ? parseFloat(profile.altura_cm) : null,
      objetivo_peso: profile.objetivo_peso ? parseFloat(profile.objetivo_peso) : null,
      fecha_objetivo_peso: profile.fecha_objetivo_peso || null,
      objetivo_lectura_anual: profile.objetivo_lectura_anual ? parseInt(profile.objetivo_lectura_anual) : 5,
    }).eq("user_id", user.id);
    setMsg("Perfil guardado ✓"); setTimeout(() => setMsg(""), 2000);
  }

  // Export completo a JSON (backup)
  async function exportar() {
    setExportando(true);
    try {
      const backup: Record<string, any> = { _exported_at: new Date().toISOString(), _app: "mi-vida" };
      for (const t of TABLAS) {
        const { data } = await supabase.from(t).select("*");
        backup[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mi-vida-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Backup descargado ✓"); setTimeout(() => setMsg(""), 2500);
    } finally { setExportando(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login"); router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="pt-2 font-display text-3xl font-semibold">Configuración</h1>

      <SectionTitle>Perfil</SectionTitle>
      {profile && (
        <Card className="space-y-3">
          <Field label="Nombre"><Input value={profile.nombre ?? ""} onChange={(e) => setProfile({ ...profile, nombre: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Altura (cm)"><Input type="number" value={profile.altura_cm ?? ""} onChange={(e) => setProfile({ ...profile, altura_cm: e.target.value })} /></Field>
            <Field label="Peso objetivo"><Input type="number" value={profile.objetivo_peso ?? ""} onChange={(e) => setProfile({ ...profile, objetivo_peso: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha objetivo"><Input type="date" value={profile.fecha_objetivo_peso ?? ""} onChange={(e) => setProfile({ ...profile, fecha_objetivo_peso: e.target.value })} /></Field>
            <Field label="Meta lectura/año"><Input type="number" value={profile.objetivo_lectura_anual ?? 5} onChange={(e) => setProfile({ ...profile, objetivo_lectura_anual: e.target.value })} /></Field>
          </div>
          <Button className="w-full" onClick={guardarPerfil}>Guardar perfil</Button>
        </Card>
      )}

      <SectionTitle>Apariencia</SectionTitle>
      <Card><ThemeSwitcher /></Card>

      <SectionTitle>Datos</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Descargá un respaldo completo de todos tus datos en formato JSON. Hacelo seguido, sobre todo antes de cambios importantes.
        </p>
        <Button variant="soft" className="w-full" onClick={exportar} disabled={exportando}>
          {exportando ? "Exportando…" : "⬇ Descargar backup (JSON)"}
        </Button>
      </Card>

      {msg && <p className="text-center text-sm" style={{ color: "var(--ok)" }}>{msg}</p>}

      <SectionTitle>Sesión</SectionTitle>
      <Button variant="danger" className="w-full" onClick={logout}>Cerrar sesión</Button>

      <p className="pb-4 pt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>Mi Vida · v1.0</p>
    </div>
  );
}
