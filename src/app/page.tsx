"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getExercises } from "@/lib/data";
import { usePlans, DAY_LABELS } from "@/hooks/usePlans";
import { useWorkouts } from "@/hooks/useWorkouts";
import { getInjuriesV2, getSessions } from "@/lib/storage";
import { INJURY_CONDITIONS_MAP } from "@/lib/rehab";
import { calculateFreshness, recommendFocusFromFreshness, GROUP_LABELS } from "@/lib/recovery";
import BodyDiagram from "@/components/BodyDiagram";
import type { DayOfWeek, Injury, MuscleRecoveryStatus } from "@/lib/types";

const DAYS: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const ENV_ICON: Record<string, string> = { home: "🏠", gym: "🏋", pilates: "🧘", any: "⚡" };
const GREETINGS = ["Bom dia", "Bom dia", "Boa tarde", "Boa tarde", "Boa tarde", "Boa noite", "Boa noite"];

// Maps recovery group names → muscle names used in BodyDiagram
const FRESHNESS_GROUP_MUSCLES: Record<string, string[]> = {
  biceps:     ["biceps"],
  triceps:    ["triceps"],
  calves:     ["calves"],
  forearms:   ["forearms"],
  chest:      ["chest", "pecs"],
  shoulders:  ["shoulders"],
  core:       ["abdominals", "obliques"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstrings"],
  glutes:     ["glutes"],
  lats:       ["lats"],
  upper_back: ["upper back", "traps"],
  lower_back: ["lower back", "erector spinae"],
};

function getGreeting() {
  return GREETINGS[Math.floor(new Date().getHours() / 4)] ?? "Olá";
}

function formatDatePT(date: Date) {
  const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

const PHASE_LABEL: Record<string, string> = {
  acute: "Aguda",
  subacute: "Subaguda",
  chronic: "Crônica",
  performance: "Performance",
};

export default function HomePage() {
  const { activePlan, todayWorkoutIds } = usePlans();
  const { workouts } = useWorkouts();
  const [exerciseCount, setExerciseCount] = useState(0);
  const [clinicalInjuries, setClinicalInjuries] = useState<Injury[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [freshness, setFreshness] = useState<MuscleRecoveryStatus[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getExercises().then((exs) => {
      setExerciseCount(exs.length);
      const injuries = getInjuriesV2();
      setClinicalInjuries(injuries);
      const sessions = getSessions();
      setSessionCount(sessions.length);

      // Streak calculation
      const dates = new Set(sessions.map((s) => s.date));
      let s = 0;
      const now = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        if (dates.has(d.toISOString().slice(0, 10))) s++;
        else if (i > 0) break;
      }
      setStreak(s);

      // Muscle freshness
      const exMap = new Map(exs.map((e) => [e.id, e]));
      setFreshness(calculateFreshness(sessions, exMap, injuries));
    });
  }, []);

  const today = DAYS[new Date().getDay()];
  const todayIds = todayWorkoutIds();
  const todayWorkouts = todayIds.map((id) => workouts.find((w) => w.id === id)).filter(Boolean);
  const activeInjuries = clinicalInjuries.filter((i) => i.phase !== "recovered");
  const focusRec = useMemo(() => recommendFocusFromFreshness(freshness), [freshness]);

  // Don't render date-dependent content until client-side to avoid hydration mismatch
  const dateLabel = mounted ? formatDatePT(new Date()) : DAY_LABELS[today];
  const greeting = mounted ? getGreeting() : "Olá";

  // Split freshness by status for compact chip display
  const fatigued = freshness.filter((s) => s.status === "resting");
  const partial = freshness.filter((s) => s.status === "partial");
  const ready = freshness.filter((s) => s.status === "ready");

  // Build muscle status map for body diagram
  const freshnessBodyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of freshness) {
      const muscles = FRESHNESS_GROUP_MUSCLES[s.group] ?? [];
      const status = s.status === "resting" ? "fatigued" : s.status === "partial" ? "recovering" : "fresh";
      muscles.forEach((m) => map.set(m, status));
    }
    return map;
  }, [freshness]);

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{greeting}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5" style={{ color: "var(--color-text)" }}>
            {dateLabel}
          </h1>
        </div>
        <span className="text-3xl mt-0.5">💪</span>
      </div>

      {/* ── Streak banner ──────────────────────────────────────────────────── */}
      {streak > 1 && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)" }}>
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>{streak} dias seguidos!</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Ótima consistência — continue assim</p>
          </div>
        </div>
      )}

      {/* ── Active Injuries ────────────────────────────────────────────────── */}
      {activeInjuries.length > 0 && (
        <div className="card p-4" style={{ borderColor: "var(--color-warning-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-warning)" }}>
                🩹 Condições ativas
              </p>
              <div className="space-y-1.5">
                {activeInjuries.map((inj) => {
                  const cond = INJURY_CONDITIONS_MAP.get(inj.conditionId);
                  return (
                    <div key={inj.id} className="flex items-center gap-2">
                      <span className="text-sm">{cond?.icon}</span>
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
                <span className="text-3xl">{ENV_ICON[w.environment]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate" style={{ color: "var(--color-primary)" }}>{w.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {w.exercises.length} exercício{w.exercises.length !== 1 ? "s" : ""}
                    {activePlan ? ` · ${activePlan.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg" style={{ color: "var(--color-text-muted)" }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        ) : activePlan ? (
          <div className="card p-5 text-center">
            <p className="text-3xl mb-2">😴</p>
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Dia de descanso</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{activePlan.name}</p>
            <Link href="/suggest" className="btn btn-primary btn-sm mt-3 inline-block">
              🤖 Sugestão extra
            </Link>
          </div>
        ) : (
          <div className="card p-5 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Nenhum plano ativo</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Crie um plano semanal ou peça uma sugestão</p>
            <div className="flex gap-2 justify-center mt-3">
              <Link href="/plans" className="btn btn-sm" style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
                Criar plano
              </Link>
              <Link href="/suggest" className="btn btn-primary btn-sm">🤖 Sugerir</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Muscle Freshness ───────────────────────────────────────────────── */}
      {freshness.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">Músculos</p>
            {focusRec && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: "var(--color-primary)", color: "var(--color-primary-text)" }}>
                Foco: {focusRec.focus === "upper" ? "Superior" : focusRec.focus === "lower" ? "Inferior" : focusRec.focus === "core" ? "Core" : "Corpo Todo"}
              </span>
            )}
          </div>

          {focusRec && (
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>{focusRec.reason}</p>
          )}

          {/* Visual body map showing recovery state */}
          <div className="card p-4 mb-3">
            <BodyDiagram
              statusMap={freshnessBodyMap}
              readOnly
              sideWidth={115}
              showLegend
            />
          </div>

          {/* Chip rows grouped by status */}
          <div className="space-y-2.5">
            {fatigued.length > 0 && (
              <MuscleChipRow label="Descansando" chips={fatigued} color="#ef4444" dot="🔴" />
            )}
            {partial.length > 0 && (
              <MuscleChipRow label="Recuperando" chips={partial} color="#f59e0b" dot="🟡" />
            )}
            {ready.length > 0 && (
              <MuscleChipRow label="Prontos" chips={ready} color="var(--color-primary)" dot="🟢" />
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="section-label mb-2">Músculos</p>
          <div className="card p-4 text-center">
            <p className="text-2xl mb-1">📈</p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Registre sessões para ver o estado de recuperação muscular
            </p>
          </div>
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Exercícios" value={exerciseCount} href="/exercises" icon="🔍" />
        <StatCard label="Treinos" value={workouts.length} href="/workouts" icon="📋" />
        <StatCard label="Sessões" value={sessionCount} href="/progress" icon="📊" />
      </div>

      {/* ── Quick access ───────────────────────────────────────────────────── */}
      <div>
        <p className="section-label mb-3">Acesso rápido</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/suggest", icon: "🤖", label: "Sugerir Treino", desc: "Adapta ao seu perfil e lesões" },
            { href: "/exercises", icon: "🔍", label: "Exercícios", desc: exerciseCount > 0 ? `${exerciseCount} com vídeos` : "Por músculo e equipamento" },
            { href: "/injuries", icon: "🩹", label: "Lesões", desc: "Protocolos de reabilitação" },
            { href: "/workouts", icon: "⚡", label: "Montar Treino", desc: "Casa, academia ou pilates" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href} className="card card-interactive p-4 group">
              <p className="text-2xl mb-1.5">{icon}</p>
              <p className="font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MuscleChipRow({
  label, chips, color, dot,
}: {
  label: string;
  chips: MuscleRecoveryStatus[];
  color: string;
  dot: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color }}>
        {dot} {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((s) => (
          <div key={s.group} className="flex items-center gap-1 rounded-full px-2.5 py-1"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
              {GROUP_LABELS[s.group]}
            </span>
            <span className="text-[10px] font-bold" style={{ color }}>{s.freshnessPct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, href, icon }: { label: string; value: number; href: string; icon: string }) {
  return (
    <Link href={href} className="card card-interactive p-4 text-center">
      <p className="text-xl mb-1">{icon}</p>
      <p className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p>
    </Link>
  );
}
