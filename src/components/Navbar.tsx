"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/exercises", label: "Exercícios" },
  { href: "/workouts", label: "Treinos" },
  { href: "/suggest", label: "🤖 Sugerir" },
  { href: "/injuries", label: "🩹 Lesões" },
  { href: "/progress", label: "📊 Progresso" },
  { href: "/plans", label: "Planos" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
        <Link href="/" className="font-bold text-lg text-[var(--color-primary)] tracking-tight">
          💪 GymApp
        </Link>
        <ul className="flex gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
