"use client";

import { useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import type { Exercise, Workout } from "@/lib/types";
import type { SessionLogs } from "../types";
import { formatElapsed } from "../types";

export function FinishModal({
  workout, sessionLogs, exerciseMap, startedAt, elapsed,
  onSave, onCancel,
}: {
  workout: Workout;
  sessionLogs: SessionLogs;
  exerciseMap: Map<string, Exercise>;
  startedAt: string;
  elapsed: number;
  onSave: (rating: number | null, rir: number | null, notes: string) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [rir, setRir] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const completedExercises = Object.entries(sessionLogs).filter(
    ([, s]) => s.sets.some((st) => st.completed)
  );
  const totalSets = Object.values(sessionLogs).reduce(
    (sum, s) => sum + s.sets.filter((st) => st.completed).length, 0
  );
  const muscles = useMemo(() => {
    const set = new Set<string>();
    for (const [exId] of completedExercises) {
      const ex = exerciseMap.get(exId);
      if (ex) {
        ex.targetMuscles.forEach((m) => set.add(m));
        ex.secondaryMuscles.slice(0, 2).forEach((m) => set.add(m));
      }
    }
    return Array.from(set).slice(0, 12);
  }, [completedExercises, exerciseMap]);

  const durationMin = Math.max(1, Math.round(elapsed / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--color-surface)" }}>
        <div className="p-5 space-y-5">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <PartyPopper size={32} style={{ color: "var(--color-primary)" }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Treino concluído!</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{workout.name}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Duração", value: formatElapsed(elapsed) },
              { label: "Exercícios", value: String(completedExercises.length) },
              { label: "Séries", value: String(totalSets) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl p-3 text-center"
                style={{ background: "var(--color-surface-2)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>{value}</p>
                <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {muscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Músculos trabalhados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {muscles.map((m) => (
                  <span key={m} className="badge badge-gray text-[11px] capitalize">{m}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Como foi o treino?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(rating === n ? null : n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    rating !== null && n <= rating
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            {rating && (
              <p className="text-xs text-center mt-1" style={{ color: "var(--color-text-muted)" }}>
                {rating <= 2 ? "Pesado, mas valeu!" : rating === 3 ? "Treino sólido" : rating === 4 ? "Ótimo treino!" : "Treino incrível!"}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Reps que sobraram no tank?
            </p>
            <p className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
              0 = fui ao limite · 5+ = muito fácil
            </p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRir(rir === n ? null : n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                    rir === n
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                  style={{
                    background: rir === n ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                  }}>
                  {n === 5 ? "5+" : n}
                </button>
              ))}
            </div>
            {rir !== null && (
              <p className="text-xs text-center mt-1" style={{ color: "var(--color-text-muted)" }}>
                {rir === 0 ? "Foi no limite!" : rir <= 2 ? "Bom esforço" : rir <= 4 ? "Podia puxar mais" : "Muito confortável"}
              </p>
            )}
          </div>

          <textarea
            placeholder="Observações (opcional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input text-sm py-2.5 w-full resize-none"
            style={{ background: "var(--color-surface-2)" }}
          />

          <div className="flex gap-2">
            <button onClick={onCancel}
              className="btn btn-secondary flex-1">
              Continuar
            </button>
            <button onClick={() => onSave(rating, rir, notes)}
              className="btn btn-primary flex-1 font-semibold">
              Salvar treino ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
