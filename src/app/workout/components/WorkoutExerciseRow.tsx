"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, Link2Off } from "lucide-react";
import ExerciseMedia from "@/components/ExerciseMedia";
import { MUSCLE_PT } from "@/lib/translations";
import type { Exercise, ExerciseSet } from "@/lib/types";

export function WorkoutExerciseRow({
  ex, config, idx, total, risky,
  isInSuperset, isStartOfSuperset,
  onRemove, onMove, onUpdate, onToggleSuperset,
}: {
  ex: Exercise;
  config: ExerciseSet;
  idx: number;
  total: number;
  risky: boolean;
  isInSuperset?: boolean;
  isStartOfSuperset?: boolean;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onUpdate: (p: Partial<ExerciseSet>) => void;
  onToggleSuperset?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl overflow-hidden transition-colors ${
      risky ? "border border-[var(--color-danger-border)]" :
      isInSuperset ? "border-2 border-[var(--color-primary)]" :
      "border border-[var(--color-border)]"
    }`}
      style={{ background: "var(--color-surface)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <Link href={`/exercises/${ex.slug}`} className="relative shrink-0 block w-12 h-12 rounded-xl overflow-hidden">
          <ExerciseMedia exercise={ex} className="w-full h-full rounded-xl" />
          {risky && (
            <span className="absolute top-0.5 right-0.5 text-[8px] bg-[var(--color-danger)] text-white rounded px-0.5 z-10">⚠</span>
          )}
        </Link>

        <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded((v) => !v)}>
          <p className="font-semibold text-sm truncate capitalize" style={{ color: "var(--color-text)" }}>{ex.name}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {ex.targetMuscles.slice(0, 3).map(m => MUSCLE_PT[m] ?? m).join(", ")}
          </p>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onUpdate({ sets: Math.max(1, config.sets - 1) })}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold leading-none transition-colors hover:bg-[var(--color-surface-2)]"
            style={{ color: "var(--color-text-muted)" }}>−</button>
          <div className="text-center min-w-[3rem]">
            <p className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>{config.sets}×{config.reps}</p>
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>séries</p>
          </div>
          <button onClick={() => onUpdate({ sets: Math.min(10, config.sets + 1) })}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold leading-none transition-colors hover:bg-[var(--color-surface-2)]"
            style={{ color: "var(--color-text-muted)" }}>+</button>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
          <button onClick={() => onMove(-1)} disabled={idx === 0}
            className="text-[var(--color-text-muted)] disabled:opacity-20 text-[10px] leading-none hover:text-[var(--color-text)]">▲</button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1}
            className="text-[var(--color-text-muted)] disabled:opacity-20 text-[10px] leading-none hover:text-[var(--color-text)]">▼</button>
        </div>
        <button onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] shrink-0"
          style={{ color: "var(--color-text-muted)" }}>×</button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2.5 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-wrap gap-3 pt-2.5">
            <label className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>Séries</span>
              <input type="number" min={1} max={10} value={config.sets}
                onChange={(e) => onUpdate({ sets: +e.target.value })}
                className="input w-12 px-1.5 py-1 text-center text-xs" />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>Repetições</span>
              <input type="text" value={config.reps}
                onChange={(e) => onUpdate({ reps: e.target.value })}
                className="input w-16 px-1.5 py-1 text-center text-xs" placeholder="12" />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>Descanso</span>
              <input type="number" min={0} step={15} value={config.rest}
                onChange={(e) => onUpdate({ rest: +e.target.value })}
                className="input w-16 px-1.5 py-1 text-center text-xs" />
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>s</span>
            </label>
          </div>
          <input type="text" value={config.notes ?? ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Observações (ex: manter costas retas)..."
            className="input text-xs py-1.5 w-full"
            style={{ background: "var(--color-surface-2)" }} />
          <Link href={`/exercises/${ex.slug}`}
            className="inline-block text-xs hover:underline"
            style={{ color: "var(--color-primary)" }}>
            Ver detalhes do exercício →
          </Link>
          {onToggleSuperset && (
            <button
              onClick={onToggleSuperset}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-xl border transition-colors"
              style={{
                borderColor: isInSuperset ? "var(--color-primary)" : "var(--color-border)",
                color: isInSuperset ? "var(--color-primary)" : "var(--color-text-muted)",
                background: isInSuperset ? "var(--color-primary-bg, var(--color-surface-2))" : "transparent",
              }}
            >
              {isInSuperset ? <Link2Off size={12} /> : <Link2 size={12} />}
              {isInSuperset ? "Remover superset" : "Superset com próximo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
