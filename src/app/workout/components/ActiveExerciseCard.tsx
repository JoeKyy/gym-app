"use client";

import { useState, useEffect } from "react";
import { Info, Trophy } from "lucide-react";
import ExerciseMedia from "@/components/ExerciseMedia";
import { parseNum } from "@/lib/parse";
import { getBestEstimated1RM, epley1RM, getProgressionSuggestion } from "@/lib/storage";
import type { Exercise, ExerciseSet } from "@/lib/types";
import type { ExerciseSessionState } from "../types";
import { ActiveSetRow } from "./ActiveSetRow";

export function ActiveExerciseCard({ ex, config, sessionState, onChange, onViewDetail, onSetCompleted }: {
  ex: Exercise;
  config: ExerciseSet;
  sessionState: ExerciseSessionState;
  onChange: (s: ExerciseSessionState) => void;
  onViewDetail: () => void;
  onSetCompleted: (restSeconds: number) => void;
}) {
  const doneSets = sessionState.sets.filter((s) => s.completed).length;
  const allDone = doneSets === sessionState.sets.length;

  const [prev1RM, setPrev1RM] = useState<number>(0);
  const [progression, setProgression] = useState<{ suggestedIncrease: number; lastWeight: number } | null>(null);
  useEffect(() => {
    const best = getBestEstimated1RM(ex.id);
    setPrev1RM(best?.estimated1RM ?? 0);
    setProgression(getProgressionSuggestion(ex.id));
  }, [ex.id]);

  const prFlags = sessionState.sets.map((s) => {
    if (!s.completed) return false;
    const reps = parseNum(s.reps) ?? 0;
    const weight = parseNum(s.weight) ?? 0;
    if (reps <= 0 || weight <= 0) return false;
    return epley1RM(weight, reps) > prev1RM;
  });
  const hasPR = prFlags.some(Boolean);

  const markAll = () => {
    const nowAllDone = !allDone;
    onChange({ sets: sessionState.sets.map((s) => ({ ...s, completed: nowAllDone })) });
    if (nowAllDone) onSetCompleted(typeof config.rest === "number" ? config.rest : 60);
  };

  return (
    <div className={`rounded-2xl overflow-hidden border transition-colors ${
      allDone ? "border-[var(--color-success-border)]" : "border-[var(--color-border)]"
    }`} style={{ background: "var(--color-surface)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <button className="flex-1 flex items-center gap-3 text-left min-w-0" onClick={onViewDetail}>
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <ExerciseMedia exercise={ex} className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate capitalize" style={{ color: "var(--color-text)" }}>
              {ex.name}
              {hasPR && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5"
                style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}><Trophy size={9} />PR!</span>}
            </p>
            <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: allDone ? "var(--color-success-text)" : "var(--color-text-muted)" }}>
              {allDone ? "✓ Concluído" : `${doneSets}/${config.sets} séries`} · alvo {config.reps} reps
              {progression && !allDone && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}>
                  ↑ +{progression.suggestedIncrease}kg
                </span>
              )}
            </p>
          </div>
          <span className="text-xs shrink-0 px-2 py-1 rounded-lg mr-1 flex items-center"
            style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}>
            <Info size={13} />
          </span>
        </button>
        <button
          onClick={markAll}
          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors shrink-0 ${
            allDone
              ? "bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-text)]"
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-success-border)]"
          }`}
        >
          {allDone ? "✓ Feito" : "Marcar todas"}
        </button>
      </div>

      <div className="px-3 pb-3 space-y-1.5 border-t pt-2.5" style={{ borderColor: "var(--color-border)" }}>
        {sessionState.sets.map((setS, i) => (
          <ActiveSetRow
            key={i} setNum={i + 1} state={setS}
            defaultReps={String(config.reps)}
            isPR={prFlags[i]}
            onChange={(ns) => {
              const wasCompleted = setS.completed;
              const nowCompleted = ns.completed;
              const newSets = [...sessionState.sets];
              newSets[i] = ns;
              onChange({ sets: newSets });
              if (!wasCompleted && nowCompleted) {
                onSetCompleted(typeof config.rest === "number" ? config.rest : 60);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
