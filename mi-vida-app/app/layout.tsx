import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Vida",
  description: "Gestión personal: objetivos, hábitos, economía",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Mi Vida" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#14151a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-mode="dark" data-paleta="indigo" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Aplica tema guardado antes del paint para evitar flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var m=localStorage.getItem('mv-mode')||'dark';
              var p=localStorage.getItem('mv-paleta')||'indigo';
              var r=document.documentElement;
              r.setAttribute('data-mode',m);
              r.setAttribute('data-paleta',p);
            }catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
