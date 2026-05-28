"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSessions, deleteSession, getTopStrengthExercises, getStrengthHistory, getProfile } from "@/lib/storage";
import { getExercises } from "@/lib/data";
import BodyMapImage from "@/components/BodyMapImage";
import { Dumbbell, Calendar, Star, Heart, Zap, Check } from "lucide-react";
import type { WorkoutSession, Exercise } from "@/lib/types";
import type { EstimatedStrength } from "@/lib/storage";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatDuration(min?: number): string {
  if (!min) return "—";
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ""}`;
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [bodyMapPeriod, setBodyMapPeriod] = useState<"7d" | "30d" | "all">("30d");

  // Strength / 1RM data
  const [topStrength, setTopStrength] = useState<(EstimatedStrength & { exercise?: Exercise })[]>([]);
  const [weeklyTargets, setWeeklyTargets] = useState<{ muscle: string; target: number }[]>([]);

  useEffect(() => {
    setSessions(getSessions().sort((a, b) => b.date.localeCompare(a.date)));
    getExercises().then((exs) => {
      const map = new Map(exs.map((e) => [e.id, e]));
      setExercises(map);
      const top = getTopStrengthExercises(6);
      setTopStrength(top.map((t) => ({ ...t, exercise: map.get(t.exerciseId) })));
    });

    const profile = getProfile();
    const TARGETS: Record<string, Record<string, number>> = {
      build_muscle:    { Peito: 16, Costas: 16, Pernas: 20, Ombros: 12, Bíceps: 10, Tríceps: 10, Core: 8 },
      get_stronger:    { Peito: 12, Costas: 12, Pernas: 16, Ombros: 8,  Bíceps: 6,  Tríceps: 6,  Core: 6 },
      get_lean:        { Peito: 12, Costas: 12, Pernas: 14, Ombros: 10, Bíceps: 8,  Tríceps: 8,  Core: 10 },
      general_fitness: { Peito: 10, Costas: 10, Pernas: 12, Ombros: 8,  Bíceps: 6,  Tríceps: 6,  Core: 8 },
      rehab:           { Peito: 6,  Costas: 8,  Pernas: 8,  Ombros: 6,  Bíceps: 4,  Tríceps: 4,  Core: 10 },
    };
    const targets = TARGETS[profile.goal] ?? TARGETS.general_fitness;
    setWeeklyTargets(Object.entries(targets).map(([muscle, target]) => ({ muscle, target })));
  }, []);

  const refresh = () =>
    setSessions(getSessions().sort((a, b) => b.date.localeCompare(a.date)));

  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const dates = new Set(sessions.map((s) => s.date));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (dates.has(key)) count++;
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const heatmap = useMemo(() => {
    const weeks: { date: string; count: number }[][] = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(start.getDate() - dayOfWeek - 7 * 11);

    const sessionMap = new Map<string, number>();
    for (const s of sessions) {
      const key = s.date;
      sessionMap.set(key, (sessionMap.get(key) ?? 0) + 1);
    }

    for (let w = 0; w < 12; w++) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + d);
        const key = cur.toISOString().slice(0, 10);
        week.push({ date: key, count: sessionMap.get(key) ?? 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [sessions]);

  const muscleVolume = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);
    const vol: Record<string, number> = {};
    for (const s of sessions) {
      if (new Date(s.startedAt) < cutoff) continue;
      for (const log of s.exercises) {
        const ex = exercises.get(log.exerciseId);
        if (!ex) continue;
        const totalSets = log.sets.filter((st) => st.completed).length;
        for (const m of ex.targetMuscles) {
          vol[m] = (vol[m] ?? 0) + totalSets;
        }
      }
    }
    return Object.entries(vol)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [sessions, exercises]);

  // Weekly volume: sets per muscle this calendar week
  const thisWeekVolume = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const MUSCLE_MAP: Record<string, string> = {
      chest: "Peito", "pectoralis major": "Peito", pecs: "Peito",
      back: "Costas", lats: "Costas", "latissimus dorsi": "Costas", traps: "Costas",
      legs: "Pernas", quads: "Pernas", quadriceps: "Pernas", hamstrings: "Pernas", glutes: "Pernas", calves: "Pernas",
      shoulders: "Ombros", deltoids: "Ombros", delts: "Ombros",
      biceps: "Bíceps",
      triceps: "Tríceps",
      abs: "Core", core: "Core", obliques: "Core",
    };

    const vol: Record<string, number> = {};
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      if (d < weekStart) continue;
      for (const log of s.exercises) {
        const ex = exercises.get(log.exerciseId);
        if (!ex) continue;
        const done = log.sets.filter((st) => st.completed).length;
        for (const m of ex.targetMuscles) {
          const key = MUSCLE_MAP[m.toLowerCase()] ?? null;
          if (key) vol[key] = (vol[key] ?? 0) + done;
        }
      }
    }
    return vol;
  }, [sessions, exercises]);

  const maxVol = muscleVolume[0]?.[1] ?? 1;

  const topExercisesForBodymap = useMemo(() => {
    const days = bodyMapPeriod === "7d" ? 7 : bodyMapPeriod === "30d" ? 30 : Infinity;
    const cutoff = new Date();
    if (isFinite(days)) cutoff.setDate(cutoff.getDate() - days);
    const counts: Record<string, { exercise: Exercise; sets: number }> = {};
    for (const s of sessions) {
      if (isFinite(days) && new Date(s.startedAt) < cutoff) continue;
      for (const log of s.exercises) {
        const ex = exercises.get(log.exerciseId);
        if (!ex) continue;
        const done = log.sets.filter((st) => st.completed).length;
        if (!counts[ex.id]) counts[ex.id] = { exercise: ex, sets: 0 };
        counts[ex.id].sets += done;
      }
    }
    return Object.values(counts)
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 4);
  }, [sessions, exercises, bodyMapPeriod]);
  const heatmapLegend = [
    "bg-[var(--color-surface-2)]",
    "bg-[var(--color-primary-soft)]",
    "bg-[var(--color-primary-soft-strong)]",
    "bg-[var(--color-primary)]",
  ];

  const handleDelete = (id: string) => {
    if (confirm("Remover esta sessão do histórico?")) {
      deleteSession(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Progresso</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">Histórico de sessões e volume de treino</p>
        </div>
        <Link href="/log" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
          ← Log
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-[var(--color-primary)]">{sessions.length}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Total de Sessões</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-[var(--color-warning)]">{streak}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Sequência atual</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold">
            {sessions.filter((s) => {
              const d = new Date(s.startedAt);
              const now = new Date();
              return (
                d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
              );
            }).length}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Este mês</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-5xl mb-4">—</p>
          <p className="text-[var(--color-text-secondary)] font-medium">Nenhuma sessão registrada ainda</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-2">
            Complete um treino para começar a rastrear seu progresso
          </p>
          <Link
            href="/workouts"
            className="mt-4 inline-flex btn btn-primary"
          >
            Ver Treinos
          </Link>
        </div>
      ) : (
        <>
          <div className="card p-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3 font-medium">Atividade — últimas 12 semanas</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={day.count > 0 ? `${day.date}: ${day.count} sessão(ões)` : day.date}
                      className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                        day.count === 0
                          ? "bg-[var(--color-surface-2)]"
                          : day.count === 1
                          ? "bg-[var(--color-primary-soft)]"
                          : day.count === 2
                          ? "bg-[var(--color-primary-soft-strong)]"
                          : "bg-[var(--color-primary)]"
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
              <span>Menos</span>
              {heatmapLegend.map((c) => (
                <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
              <span>Mais</span>
            </div>
          </div>

          {muscleVolume.length > 0 && (
            <div className="card p-4">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3 font-medium">Volume por músculo (últimas 4 semanas)</p>
              <div className="space-y-2">
                {muscleVolume.map(([muscle, vol]) => (
                  <div key={muscle} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)] w-28 capitalize shrink-0">{muscle}</span>
                    <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)] h-2 rounded-full transition-all"
                        style={{ width: `${(vol / maxVol) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] w-10 text-right">{vol} sets</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topExercisesForBodymap.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[var(--color-text-secondary)] font-medium">🗺 Músculos trabalhados</p>
                <div className="flex gap-1">
                  {(["7d", "30d", "all"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setBodyMapPeriod(p)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        bodyMapPeriod === p
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold"
                          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {p === "all" ? "Tudo" : p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {topExercisesForBodymap.map(({ exercise, sets }) => (
                  <div key={exercise.id} className="flex flex-col items-center gap-1 shrink-0">
                    <BodyMapImage
                      slug={exercise.slug}
                      targetMuscles={exercise.targetMuscles}
                      defaultView="auto"
                      size="sm"
                      showToggle={false}
                    />
                    <p className="text-xs text-[var(--color-text-secondary)] text-center max-w-[100px] leading-tight">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{sets} sets</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Força — 1RM estimates ─────────────────────────────── */}
          {topStrength.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
                <Dumbbell size={14} /> Força — 1RM Estimado
              </p>
              <div className="space-y-3">
                {topStrength.map(({ exerciseId, exercise, estimated1RM }) => {
                  const history = getStrengthHistory(exerciseId);
                  const max = Math.max(...history.map((h) => h.estimated1RM), 1);
                  const w = 80;
                  const h = 28;
                  const pts = history.map((p, i) => {
                    const x = history.length < 2 ? w / 2 : (i / (history.length - 1)) * w;
                    const y = h - (p.estimated1RM / max) * h;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <div key={exerciseId} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{exercise?.name ?? exerciseId}</p>
                      </div>
                      {history.length >= 2 && (
                        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
                          <polyline points={pts}
                            fill="none" stroke="var(--color-primary)" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span className="text-sm font-bold text-[var(--color-primary)] w-16 text-right shrink-0">
                        {estimated1RM.toFixed(1)} kg
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                Estimativa via fórmula de Epley: 1RM = peso × (1 + reps/30)
              </p>
            </div>
          )}

          {/* ── Esta Semana — volume targets ──────────────────────── */}
          {weeklyTargets.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
                <Calendar size={14} /> Esta semana — meta de volume
              </p>
              <div className="space-y-2.5">
                {weeklyTargets.map(({ muscle, target }) => {
                  const current = thisWeekVolume[muscle] ?? 0;
                  const pct = Math.min(100, (current / target) * 100);
                  const done = current >= target;
                  return (
                    <div key={muscle}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`flex items-center gap-1 ${done ? "text-[var(--color-success)] font-semibold" : "text-[var(--color-text-secondary)]"}`}>
                          {done && <Check size={11} />}{muscle}
                        </span>
                        <span className="text-[var(--color-text-muted)]">{current}/{target} sets</span>
                      </div>
                      <div className="bg-[var(--color-surface-2)] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: done ? "var(--color-success)" : "var(--color-primary)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/profile" className="text-[10px] text-[var(--color-primary)] mt-2 inline-block">
                Alterar objetivo no perfil →
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Histórico de Sessões
            </h2>
            {sessions.map((session) => {
              const date = new Date(session.date + "T12:00:00");
              return (
                <div
                  key={session.id}
                  className="card p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{session.workoutName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-muted)]">
                        <span>
                          {DAY_LABELS[date.getDay()]},{" "}
                          {date.getDate()} {MONTH_LABELS[date.getMonth()]}
                        </span>
                        {session.durationMinutes && (
                          <span>· {formatDuration(session.durationMinutes)}</span>
                        )}
                        {session.rating && (
                          <span className="flex items-center gap-0.5">
                            · {Array.from({ length: session.rating }).map((_, i) => (
                              <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                            ))}
                          </span>
                        )}
                        {session.rir !== undefined && (
                          <span>· RiR {session.rir}</span>
                        )}
                      </div>
                      {/* Health metrics row */}
                      {(session.heartRateAvg || session.calories) && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {session.heartRateAvg && (
                            <span className="flex items-center gap-1 text-red-400">
                              <Heart size={10} />
                              {session.heartRateAvg}{session.heartRateMax ? `–${session.heartRateMax}` : ""} bpm
                            </span>
                          )}
                          {session.calories && (
                            <span className="flex items-center gap-1 text-orange-400">
                              <Zap size={10} /> {session.calories} kcal
                            </span>
                          )}
                          {session.externalSource && (
                            <span className="text-[var(--color-text-muted)]">
                              · {session.externalSource === "strava" ? "Strava" : "Health"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-lg p-0.5"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.exercises.map((log) => {
                      const ex = exercises.get(log.exerciseId);
                      const done = log.sets.filter((s) => s.completed).length;
                      return (
                        <div
                          key={log.exerciseId}
                          className="text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] px-2 py-1 rounded-lg"
                        >
                          <span className="text-[var(--color-text-secondary)]">{ex?.name ?? log.exerciseId}</span>
                          <span className="text-[var(--color-text-muted)] ml-1">{done} sets</span>
                        </div>
                      );
                    })}
                  </div>
                  {session.notes && (
                    <p className="text-xs text-[var(--color-text-muted)] italic">{session.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
