"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, Input, Button } from "@/components/ui";

export default function Register() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(""); setMsg(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password: pass, options: { data: { nombre } },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg("Cuenta creada. Si pide confirmación, revisá tu email; si no, ya podés ingresar.");
    setTimeout(() => router.push("/auth/login"), 1500);
  }

  return (
    <Card>
      <h1 className="font-display text-3xl font-semibold">Crear cuenta</h1>
      <p className="mb-6 mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Empezá a organizar tu vida</p>
      <div className="space-y-3">
        <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
        {err && <p className="text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
        {msg && <p className="text-sm" style={{ color: "var(--ok)" }}>{msg}</p>}
        <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Creando…" : "Registrarme"}</Button>
      </div>
      <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        ¿Ya tenés cuenta? <Link href="/auth/login" style={{ color: "var(--accent)" }}>Ingresá</Link>
      </p>
    </Card>
  );
}
