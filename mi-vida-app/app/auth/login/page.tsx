"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, Input, Button } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    router.push("/"); router.refresh();
  }

  return (
    <Card>
      <h1 className="font-display text-3xl font-semibold">Mi Vida</h1>
      <p className="mb-6 mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Entrá a tu cuenta</p>
      <div className="space-y-3">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
        {err && <p className="text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
        <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Entrando…" : "Ingresar"}</Button>
      </div>
      <p className="mt-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        ¿No tenés cuenta? <Link href="/auth/register" style={{ color: "var(--accent)" }}>Registrate</Link>
      </p>
    </Card>
  );
}
