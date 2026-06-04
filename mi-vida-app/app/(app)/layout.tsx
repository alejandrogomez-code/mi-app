import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import BottomNav from "@/components/layout/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Seed de categorías la primera vez (RPC idempotente).
  await supabase.rpc("seed_categorias_default");

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <main className="px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
