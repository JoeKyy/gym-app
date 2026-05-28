"use client";

import { Trophy } from "lucide-react";
import type { SetState } from "../types";

export function ActiveSetRow({ setNum, state, onChange, defaultReps, isPR }: {
  setNum: number;
  state: SetState;
  defaultReps: string;
  onChange: (s: SetState) => void;
  isPR?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors min-w-0 ${
      state.completed ? "bg-[var(--color-success-bg)] border border-[var(--color-success-border)]" : "bg-[var(--color-surface-2)]"
    }`}>
      <button
        onClick={() => onChange({ ...state, completed: !state.completed })}
        aria-label={`Marcar série ${setNum} concluída`}
        aria-pressed={state.completed}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
          state.completed
            ? "bg-[var(--color-success)] border-[var(--color-success)] text-black"
            : "border-[var(--color-border)] text-transparent"
        }`}
      >✓</button>

      <span className="text-xs font-semibold w-4 shrink-0 text-center" style={{ color: "var(--color-text-muted)" }}>
        {setNum}
      </span>

      <input
        type="number" inputMode="decimal" placeholder="—"
        aria-label={`Peso série ${setNum} (kg)`}
        value={state.weight}
        onChange={(e) => onChange({ ...state, weight: e.target.value })}
        className="input text-xs text-center py-1 px-1 min-w-0 flex-1"
      />
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>kg</span>

      <input
        type="text" inputMode="numeric"
        placeholder={defaultReps}
        aria-label={`Repetições série ${setNum}`}
        value={state.reps}
        onChange={(e) => onChange({ ...state, reps: e.target.value })}
        className="input text-xs text-center py-1 px-1 min-w-0 flex-1"
      />
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>reps</span>

      {isPR && state.completed && (
        <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
          style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)", border: "1px solid var(--color-warning-border)" }}>
          <Trophy size={10} />PR
        </span>
      )}
    </div>
  );
}
