"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getExercises } from "@/lib/data";
import { usePlans, DAY_LABELS } from "@/hooks/usePlans";
import { useWorkouts } from "@/hooks/useWorkouts";
import { getInjuriesV2, getSessions } from "@/lib/storage";
import { INJURY_CONDITIONS_MAP } from "@/lib/rehab";
import {
  Dumbbell, Flame, HeartPulse, Moon, Sparkles, ChevronRight,
  RefreshCw, MoreHorizontal, Home, Zap,
} from "lucide-react";
import type { DayOfWeek, Injury } from "@/lib/types";

const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const GREETINGS = ["Bom dia", "Bom dia", "Boa tarde", "Boa tarde", "Boa tarde", "Boa noite", "Boa noite"];

const ENV_ICON: Record<string, React.ReactNode> = {
  home:    <Home    size={22} />,
  gym:     <Dumbbell size={22} />,
  pilates: <Zap    size={22} />,
  any:     <Zap    size={22} />,
};

const PHASE_LABEL: Record<string, string> = {
  acute: "Aguda", subacute: "Subaguda", chronic: "Crônica", performance: "Performance",
};

function formatDatePT(date: Date) {
  const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

export default function HomePage() {
  const { activePlan, todayWorkoutIds } = usePlans();
  const { workouts } = useWorkouts();
  const [clinicalInjuries, setClinicInjuries] = useState<Injury[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getExercises().then(() => {
      setClinicInjuries(getInjuriesV2());
    });
  }, []);

  const today = DAYS[new Date().getDay()];
  const todayIds = todayWorkoutIds();
  const todayWorkouts = todayIds.map((id) => workouts.find((w) => w.id === id)).filter(Boolean);
  const activeInjuries = clinicalInjuries.filter((i) => i.phase !== "recovered");

  const greeting = mounted ? GREETINGS[Math.floor(new Date().getHours() / 4)] ?? "Olá" : "Olá";
  const dateLabel = mounted ? formatDatePT(new Date()) : DAY_LABELS[today];

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{greeting}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5" style={{ color: "var(--color-text)" }}>
            {dateLabel}
          </h1>
        </div>
        <Dumbbell size={28} style={{ color: "var(--color-primary)" }} className="mt-1" />
      </div>

      {/* ── Streak banner ──────────────────────────────────────────────────── */}
      <StreakBanner />

      {/* ── Active Injuries ────────────────────────────────────────────────── */}
      {activeInjuries.length > 0 && (
        <div className="card p-4" style={{ borderColor: "var(--color-warning-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"
                style={{ color: "var(--color-warning)" }}>
                <HeartPulse size={14} /> Condições ativas
              </p>
              <div className="space-y-1.5">
                {activeInjuries.map((inj) => {
                  const cond = INJURY_CONDITIONS_MAP.get(inj.conditionId);
                  return (
                    <div key={inj.id} className="flex items-center gap-2">
                      {cond?.icon && <span className="text-sm">{cond.icon}</span>}
                      <span className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                        {cond?.name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
                        {PHASE_LABEL[inj.phase]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Link href="/suggest" className="btn btn-primary btn-sm shrink-0 mt-1">
              Sugerir
            </Link>
          </div>
        </div>
      )}

      {/* ── Today's Workout ────────────────────────────────────────────────── */}
      <div>
        <p className="section-label mb-2">Treino de Hoje</p>
        {todayWorkouts.length > 0 ? (
          <div className="space-y-2">
            {todayWorkouts.map((w) => w && (
              <Link key={w.id} href={`/workout?id=${w.id}`}
                className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-opacity hover:opacity-90 active:opacity-75"
                style={{ background: "var(--color-primary-soft-strong)", border: "1px solid var(--color-primary-border)" }}>
                <span style={{ color: "var(--color-primary)" }}>
                  {ENV_ICON[w.environment] ?? <Dumbbell size={22} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate" style={{ color: "var(--color-primary)" }}>{w.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {w.exercises.length} exercício{w.exercises.length !== 1 ? "s" : ""}
                    {activePlan ? ` · ${activePlan.name}` : ""}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: "var(--color-text-muted)" }} />
              </Link>
            ))}
          </div>
        ) : activePlan ? (
          <div className="card p-5 text-center">
            <Moon size={32} className="mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Dia de descanso</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{activePlan.name}</p>
            <Link href="/suggest" className="btn btn-primary btn-sm mt-3 inline-flex items-center gap-1.5">
              <Sparkles size={13} /> Sugestão extra
            </Link>
          </div>
        ) : (
          <div className="card p-5 text-center">
            <Dumbbell size={32} className="mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Nenhum plano ativo</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              Crie um plano semanal ou peça uma sugestão
            </p>
            <div className="flex gap-2 justify-center mt-3">
              <Link href="/plans" className="btn btn-sm"
                style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
                Criar plano
              </Link>
              <Link href="/suggest" className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
                <Sparkles size={13} /> Sugerir
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick access ───────────────────────────────────────────────────── */}
      <div>
        <p className="section-label mb-3">Acesso rápido</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickCard href="/suggest"   Icon={Sparkles}      label="Sugerir Treino"   desc="Adapta ao seu perfil e lesões" />
          <QuickCard href="/exercises" Icon={Dumbbell}      label="Exercícios"       desc="Biblioteca completa" />
          <QuickCard href="/injuries"  Icon={HeartPulse}    label="Lesões"           desc="Protocolos de reabilitação" />
          <QuickCard href="/workouts"  Icon={RefreshCw}     label="Montar Treino"    desc="Casa, academia ou pilates" />
        </div>
      </div>
    </div>
  );
}

function QuickCard({ href, Icon, label, desc }: {
  href: string; Icon: React.ElementType; label: string; desc: string;
}) {
  return (
    <Link href={href} className="card card-interactive p-4 group">
      <Icon size={22} className="mb-2 transition-colors group-hover:text-[var(--color-primary)]"
        style={{ color: "var(--color-text-muted)" }} />
      <p className="font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">
        {label}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
    </Link>
  );
}

function StreakBanner() {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const sessions = getSessions();
    const dates = new Set(sessions.map((s: { date: string }) => s.date));
    let s = 0;
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (dates.has(d.toISOString().slice(0, 10))) s++;
      else if (i > 0) break;
    }
    setStreak(s);
  }, []);

  if (streak <= 1) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)" }}>
      <Flame size={22} className="text-orange-400 shrink-0" />
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
          {streak} dias seguidos!
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Ótima consistência — continue assim
        </p>
      </div>
    </div>
  );
}
