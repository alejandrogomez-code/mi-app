import { NextResponse, type NextRequest } from "next/server";

// Middleware mínimo: no toca Supabase (evita el error de runtime).
// La verificación de sesión la hace cada layout del lado del servidor.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
