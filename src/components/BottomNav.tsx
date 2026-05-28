"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Activity, ClipboardList } from "lucide-react";

const TABS = [
  { href: "/",     label: "Workout", Icon: Dumbbell,      exact: true },
  { href: "/body", label: "Body",    Icon: Activity,      exact: false },
  { href: "/log",  label: "Log",     Icon: ClipboardList, exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
      <ul className="flex items-center justify-around h-16 max-w-3xl mx-auto px-4">
        {TABS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1 relative">
              <Link href={href}
                style={{ color: active ? "var(--color-primary)" : "var(--color-text-muted)" }}
                className="flex flex-col items-center justify-center h-16 gap-1 transition-colors px-2"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: "var(--color-primary)" }} />
                )}
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75}
                  className={`transition-transform duration-150 ${active ? "scale-110" : ""}`} />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
