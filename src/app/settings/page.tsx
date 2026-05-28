"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Settings, Calendar, HeartPulse, RefreshCw,
  Dumbbell, ChevronRight, ChevronLeft, Database,
} from "lucide-react";

const SECTIONS = [
  {
    label: "Perfil",
    items: [
      { href: "/profile",   Icon: User,       label: "Meu Perfil",         desc: "Objetivo, nível, split e dados corporais" },
    ],
  },
  {
    label: "Treino",
    items: [
      { href: "/equipment", Icon: Settings,    label: "Meus Equipamentos",  desc: "Selecionar o que você tem disponível" },
      { href: "/plans",     Icon: Calendar,    label: "Planos Semanais",    desc: "Organizar treinos por dia da semana" },
      { href: "/exercises", Icon: Dumbbell,    label: "Biblioteca",         desc: "Explorar exercícios e preferências" },
    ],
  },
  {
    label: "Saúde",
    items: [
      { href: "/injuries",  Icon: HeartPulse,  label: "Lesões Ativas",      desc: "Protocolos McGill, McKenzie e outros" },
    ],
  },
  {
    label: "Dados",
    items: [
      { href: "/sync",      Icon: RefreshCw,   label: "Sincronizar",        desc: "Strava e Apple Health" },
      { href: "/progress",  Icon: Database,    label: "Histórico detalhado",desc: "Força (1RM), volume e gráficos" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Configurações</h1>
        </div>
      </div>

      {SECTIONS.map(({ label, items }) => (
        <div key={label}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: "var(--color-text-muted)" }}>
            {label}
          </p>
          <div className="space-y-1">
            {items.map(({ href, Icon, label: itemLabel, desc }) => (
              <Link key={href} href={href}
                className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: "var(--color-surface-2)" }}>
                  <Icon size={18} style={{ color: "var(--color-text-muted)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{itemLabel}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center pt-2 pb-4">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>GymApp — v1.0</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-border)" }}>
          Todos os dados salvos localmente no dispositivo
        </p>
      </div>
    </div>
  );
}
