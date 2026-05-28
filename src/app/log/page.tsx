"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSessions, deleteSession } from "@/lib/storage";
import { getExercises } from "@/lib/data";
import { Settings, Flame, Trash2, Heart, Zap, ChevronRight } from "lucide-react";
import type { WorkoutSession, Exercise } from "@/lib/types";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatDuration(min?: number) {
  if (!min) return "—";
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ""}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-xs">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
  );
}

export default function LogPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());

  useEffect(() => {
    setSessions(getSessions().sort((a, b) => b.date.localeCompare(a.date)));
    getExercises().then((exs) => setExercises(new Map(exs.map((e) => [e.id, e]))));
  }, []);

  const refresh = () => setSessions(getSessions().sort((a, b) => b.date.localeCompare(a.date)));

  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    const dates = new Set(sessions.map((s) => s.date));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (dates.has(d.toISOString().slice(0, 10))) count++;
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      const d = new Date(s.startedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [sessions]);

  const handleDelete = (id: string) => {
    if (confirm("Remover esta sessão?")) {
      deleteSession(id);
      refresh();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Log</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Histórico e progresso
          </p>
        </div>
        <Link href="/settings"
          className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
          <Settings size={18} />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{sessions.length}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Sessões</p>
        </div>
        <div className="card p-3 text-center flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Flame size={16} className="text-orange-400" />
            <p className="text-2xl font-bold text-orange-400">{streak}</p>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Sequência</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{thisMonth}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Este mês</p>
        </div>
      </div>

      {/* Progress detail link */}
      <Link href="/progress"
        className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          Ver força (1RM) e volume semanal
        </span>
        <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
      </Link>

      {/* Session history */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}>
          Sessões
        </p>

        {sessions.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Nenhuma sessão registrada</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              Complete um treino para começar seu histórico
            </p>
            <Link href="/" className="btn btn-primary btn-sm mt-4 inline-block">
              Ir para treino
            </Link>
          </div>
        ) : (
          sessions.map((session) => {
            const date = new Date(session.date + "T12:00:00");
            return (
              <div key={session.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--color-text)" }}>
                      {session.workoutName}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {DAY_LABELS[date.getDay()]}, {date.getDate()} {MONTH_LABELS[date.getMonth()]}
                      </span>
                      {session.durationMinutes && (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          · {formatDuration(session.durationMinutes)}
                        </span>
                      )}
                      {session.rating && <StarRating rating={session.rating} />}
                      {session.rir !== undefined && (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          · RiR {session.rir}
                        </span>
                      )}
                    </div>
                    {(session.heartRateAvg || session.calories) && (
                      <div className="flex items-center gap-3 mt-1">
                        {session.heartRateAvg && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <Heart size={11} /> {session.heartRateAvg}
                            {session.heartRateMax ? `–${session.heartRateMax}` : ""} bpm
                          </span>
                        )}
                        {session.calories && (
                          <span className="flex items-center gap-1 text-xs text-orange-400">
                            <Zap size={11} /> {session.calories} kcal
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(session.id)}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ color: "var(--color-text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {session.exercises.map((log) => {
                    const ex = exercises.get(log.exerciseId);
                    const done = log.sets.filter((s) => s.completed).length;
                    return (
                      <span key={log.exerciseId}
                        className="text-xs rounded-lg px-2 py-1"
                        style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                        {ex?.name ?? log.exerciseId}
                        <span className="ml-1 font-medium" style={{ color: "var(--color-text)" }}>
                          {done}×
                        </span>
                      </span>
                    );
                  })}
                </div>
                {session.notes && (
                  <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                    {session.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
