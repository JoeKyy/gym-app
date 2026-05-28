"use client";

import ExerciseCard from "@/components/ExerciseCard";
import type { Exercise } from "@/lib/types";

export function ExercisePicker({
  allExercises, search, onSearchChange,
  hideRisky, onHideRiskyToggle,
  respectEnv, onRespectEnvToggle,
  hasEnvFilter, hasInjuries,
  results, onAdd, onClose,
}: {
  allExercises: Exercise[];
  search: string;
  onSearchChange: (s: string) => void;
  hideRisky: boolean;
  onHideRiskyToggle: () => void;
  respectEnv: boolean;
  onRespectEnvToggle: () => void;
  hasEnvFilter: boolean;
  hasInjuries: boolean;
  results: Exercise[];
  onAdd: (ex: Exercise) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto rounded-t-3xl flex flex-col overflow-hidden max-h-[85vh]"
        style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}>
          <input autoFocus type="search" placeholder="Buscar exercício..."
            value={search} onChange={(e) => onSearchChange(e.target.value)}
            className="input flex-1" />
          <button onClick={onClose} className="btn btn-sm shrink-0"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
            Fechar
          </button>
        </div>

        <div className="flex gap-2 flex-wrap px-4 py-2.5 border-b shrink-0 text-xs"
          style={{ borderColor: "var(--color-border)" }}>
          {hasEnvFilter && (
            <button onClick={onRespectEnvToggle}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                respectEnv
                  ? "bg-[var(--color-primary-soft)] border-[var(--color-primary-border)] text-[var(--color-primary)]"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}>
              {respectEnv ? "✓ " : ""}Filtrar ambiente
            </button>
          )}
          {hasInjuries && (
            <button onClick={onHideRiskyToggle}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                hideRisky
                  ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}>
              {hideRisky ? "✓ " : ""}Ocultar arriscados
            </button>
          )}
          <span className="ml-auto self-center" style={{ color: "var(--color-text-muted)" }}>
            {results.length} exercícios
          </span>
        </div>

        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {results.slice(0, 80).map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} isRisky={false} onAddToWorkout={onAdd} />
          ))}
          {results.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nenhum exercício encontrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
