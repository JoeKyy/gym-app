"use client";
import Link from "next/link";

const MORE_ITEMS = [
  { href: "/suggest",   icon: "🤖", label: "Sugerir Treino",       desc: "Treino adaptado ao seu perfil e lesões" },
  { href: "/injuries",  icon: "🩹", label: "Gerir Lesões",          desc: "Protocolos McGill, McKenzie e outros" },
  { href: "/plans",     icon: "📅", label: "Planos Semanais",       desc: "Organizar treinos por dia da semana" },
  { href: "/equipment", icon: "⚙",  label: "Meus Equipamentos",     desc: "Selecionar o que você tem disponível" },
];

export default function MorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mais</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Funcionalidades adicionais</p>
      </div>

      <div className="space-y-2">
        {MORE_ITEMS.map(({ href, icon, label, desc }) => (
          <Link key={href} href={href} className="card card-interactive flex items-center gap-4 p-4">
            <span className="text-3xl w-10 text-center">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</p>
            </div>
            <span className="text-[var(--color-text-muted)] text-lg">›</span>
          </Link>
        ))}
      </div>

      <div className="card p-4 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">💪 GymApp — v1.0</p>
        <p className="text-xs text-[var(--color-border)] mt-1">Todos os dados salvos localmente no dispositivo</p>
      </div>
    </div>
  );
}
