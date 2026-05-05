"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoje", icon: "🏠", exact: true },
  { href: "/exercises", label: "Explorar", icon: "🔍", exact: false },
  { href: "/workouts", label: "Treinar", icon: "▶", exact: false },
  { href: "/progress", label: "Progresso", icon: "📊", exact: false },
  { href: "/more", label: "Mais", icon: "☰", exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
      <ul className="flex items-center justify-around h-16 max-w-4xl mx-auto px-2">
        {TABS.map(({ href, label, icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1 relative">
              <Link href={href}
                style={{ color: active ? "var(--color-primary)" : "var(--color-text-muted)" }}
                className="flex flex-col items-center justify-center h-16 gap-0.5 transition-colors"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
                    style={{ background: "var(--color-primary)" }} />
                )}
                <span className={`text-xl leading-none transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                  {icon}
                </span>
                <span className="text-[10px] font-semibold tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
