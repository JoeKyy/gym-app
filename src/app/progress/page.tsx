"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSessions, deleteSession } from "@/lib/storage";
import { getExercises } from "@/lib/data";
import type { WorkoutSession, Exercise } from "@/lib/types";

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

  useEffect(() => {
    setSessions(getSessions().sort((a, b) => b.date.localeCompare(a.date)));
    getExercises().then((exs) => setExercises(new Map(exs.map((e) => [e.id, e]))));
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

  const maxVol = muscleVolume[0]?.[1] ?? 1;
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
          <h1 className="text-2xl font-bold flex items-center gap-2">📊 Progresso</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">Histórico de sessões e volume de treino</p>
        </div>
        <Link href="/workouts" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
          ← Treinos
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-[var(--color-primary)]">{sessions.length}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Total de Sessões</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-[var(--color-warning)]">{streak}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">🔥 Sequência atual</p>
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
          <p className="text-5xl mb-4">📋</p>
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
                          <span>· {"⭐".repeat(session.rating)}</span>
                        )}
                      </div>
                      {/* Health metrics row */}
                      {(session.heartRateAvg || session.calories) && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {session.heartRateAvg && (
                            <span className="text-red-400">
                              ❤️ {session.heartRateAvg}
                              {session.heartRateMax ? `–${session.heartRateMax}` : ""} bpm
                            </span>
                          )}
                          {session.calories && (
                            <span className="text-orange-400">🔥 {session.calories} kcal</span>
                          )}
                          {session.externalSource && (
                            <span className="text-[var(--color-text-muted)]">
                              · {session.externalSource === "strava" ? "🚴 Strava" : "🍎 Health"}
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
