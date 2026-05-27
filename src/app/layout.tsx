import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GymApp — Meu Planner de Treinos",
  description: "Planejador pessoal de exercícios com suporte a lesões",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymApp",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#111827" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gymapp:theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col`}
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex justify-end px-4 sm:px-6 py-3 w-full"
          style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <ThemeToggle />
        </div>
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-32">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
