"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, ChevronLeft, Dumbbell, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { getAvailableAngles, getVideoUrl } from "@/components/ExerciseMedia";
import type { VideoAngle } from "@/components/ExerciseMedia";
import BodyMapImage from "@/components/BodyMapImage";
import { getExercisePreference, setExercisePreference } from "@/lib/storage";
import { DIFFICULTY_PT, EQUIPMENT_PT, MECHANIC_PT, MUSCLE_PT } from "@/lib/translations";
import type { ExercisePreferenceState, Exercise } from "@/lib/types";
import type { ExerciseSessionState, SheetSetRow } from "../types";
import { RestTimerOverlay } from "./RestTimerOverlay";

const ANGLE_LABELS: Record<string, string> = {
  frontMale: "♂ Frontal", sideMale: "♂ Lateral",
  frontFemale: "♀ Frontal", sideFemale: "♀ Lateral",
};

const SHEET_DEFAULT_SETS = 3;
const SHEET_DEFAULT_REPS = "12";
const SHEET_REST_SECS = 60;

export function ExerciseDetailSheet({ ex, onClose, injuredMuscleNames, sessionState, onSessionChange }: {
  ex: Exercise;
  onClose: () => void;
  injuredMuscleNames: string[];
  sessionState?: ExerciseSessionState;
  onSessionChange?: (s: ExerciseSessionState) => void;
}) {
  const availableAngles = getAvailableAngles(ex);
  const [angle, setAngle] = useState<VideoAngle>(availableAngles[0] ?? "frontMale");
  const [videoError, setVideoError] = useState(false);
  const videoUrl = getVideoUrl(ex, angle);
  const [preference, setPreference] = useState<ExercisePreferenceState>(() => getExercisePreference(ex.id));

  const initSets = (): SheetSetRow[] => {
    if (sessionState?.sets.length) {
      return sessionState.sets.map((s, i) => ({ id: i + 1, weight: s.weight, reps: s.reps, done: s.completed }));
    }
    return Array.from({ length: SHEET_DEFAULT_SETS }, (_, i) => ({ id: i + 1, weight: "", reps: SHEET_DEFAULT_REPS, done: false }));
  };
  const [sets, setSets] = useState<SheetSetRow[]>(initSets);
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  const [allDone, setAllDone] = useState(false);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneSetsCount = sets.filter((s) => s.done).length;

  useEffect(() => {
    if (restTimeLeft === null) {
      if (restRef.current) clearInterval(restRef.current);
      return;
    }
    if (restTimeLeft <= 0) {
      setRestTimeLeft(null);
      return;
    }
    restRef.current = setInterval(() => setRestTimeLeft((t) => (t !== null && t > 1 ? t - 1 : null)), 1000);
    return () => {
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [restTimeLeft]);

  const syncSession = (updatedSets: SheetSetRow[]) => {
    onSessionChange?.({ sets: updatedSets.map((s) => ({ reps: s.reps, weight: s.weight, completed: s.done })) });
  };

  const risky = injuredMuscleNames.some((m) =>
    [...ex.targetMuscles, ...ex.secondaryMuscles].map((s) => s.toLowerCase()).includes(m.toLowerCase())
  );
  const riskyMuscles = injuredMuscleNames.filter((m) =>
    [...ex.targetMuscles, ...ex.secondaryMuscles].map((s) => s.toLowerCase()).includes(m.toLowerCase())
  );

  const toggleSet = (id: number) => {
    const updated = sets.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    const justDone = !sets.find((s) => s.id === id)?.done;
    if (justDone) {
      if (updated.find((s) => !s.done)) setRestTimeLeft(SHEET_REST_SECS);
      else setAllDone(true);
    }
    setSets(updated);
    syncSession(updated);
  };
  const updateSet = (id: number, field: "weight" | "reps", value: string) => {
    const updated = sets.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    setSets(updated);
    syncSession(updated);
  };
  const addSet = () => {
    const updated = [...sets, { id: Date.now(), weight: "", reps: SHEET_DEFAULT_REPS, done: false }];
    setSets(updated);
    syncSession(updated);
    setAllDone(false);
  };
  const resetSets = () => {
    setSets(initSets());
    setRestTimeLeft(null);
    setAllDone(false);
    syncSession(initSets());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="relative w-full bg-black shrink-0" style={{ aspectRatio: "1 / 1", maxHeight: "60vw" }}>
          {videoUrl && !videoError ? (
            <video key={videoUrl} src={videoUrl} autoPlay loop muted playsInline
              onError={() => setVideoError(true)}
              className="w-full h-full object-contain" />
          ) : ex.gifUrl ? (
            <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Dumbbell size={64} style={{ color: "var(--color-text-muted)" }} />
            </div>
          )}

          <button onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <ChevronLeft size={20} />
          </button>
        </div>

        {availableAngles.length > 1 && (
          <div className="flex justify-center gap-2 px-4 pt-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            {availableAngles.map((a) => (
              <button key={a}
                onClick={() => { setAngle(a); setVideoError(false); }}
                className={`text-xs px-3 py-2 rounded-full whitespace-nowrap transition-colors mb-2 ${
                  angle === a
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold"
                    : "text-[var(--color-text-muted)]"
                }`}
                style={angle !== a ? { background: "var(--color-surface-2)" } : {}}
              >{ANGLE_LABELS[a] ?? a}</button>
            ))}
          </div>
        )}

        <div className="px-4 pt-5 space-y-5 pb-12">
          <div>
            <h1 className="text-2xl font-bold leading-tight capitalize">{ex.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {ex.difficulty && (
                <span className={`badge ${ex.difficulty === "beginner" ? "badge-green" : ex.difficulty === "intermediate" ? "badge-amber" : "badge-red"}`}>
                  {DIFFICULTY_PT[ex.difficulty] ?? ex.difficulty}
                </span>
              )}
              {ex.mechanic && <span className="badge badge-gray">{MECHANIC_PT[ex.mechanic] ?? ex.mechanic}</span>}
              {ex.equipments?.map((eq) => (
                <span key={eq} className="badge badge-gray">{EQUIPMENT_PT[eq] ?? eq}</span>
              ))}
              {risky && <span className="badge badge-red">⚠ Risco: {riskyMuscles.join(", ")}</span>}
            </div>
          </div>

          <div className="card p-3">
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
              Preferência no gerador
            </p>
            <div className="flex gap-2">
              {([
                { state: "more" as const, Icon: ThumbsUp, label: "Mais" },
                { state: "less" as const, Icon: ThumbsDown, label: "Menos" },
                { state: "excluded" as const, Icon: Ban, label: "Excluir" },
              ]).map(({ state, Icon, label }) => {
                const active = preference === state;
                return (
                  <button key={state}
                    onClick={() => {
                      const next: ExercisePreferenceState = active ? "default" : state;
                      setExercisePreference(ex.id, next);
                      setPreference(next);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                      active
                        ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                    style={{ background: active ? "var(--color-primary-soft)" : "var(--color-surface-2)" }}>
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>
            {preference !== "default" && (
              <p className="text-[10px] text-[var(--color-primary)] mt-1.5 text-center">
                {preference === "more" ? "Priorizado no gerador" : preference === "less" ? "Reduzido no gerador" : "Nunca será sugerido"}
              </p>
            )}
          </div>

          {(ex.targetMuscles.length > 0 || ex.secondaryMuscles.length > 0) && (
            <div className="card p-4 space-y-3">
              <p className="section-label">Músculos</p>
              <div className="flex gap-5 items-center justify-center">
                <BodyMapImage slug={ex.slug} targetMuscles={ex.targetMuscles} defaultView="auto" size="md" className="shrink-0" />
                <div className="flex flex-col gap-3 pt-2">
                  {ex.targetMuscles.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>Primários</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ex.targetMuscles.map((m) => (
                          <span key={m} className={`badge font-semibold ${injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-green"}`}>
                            {MUSCLE_PT[m] ?? m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ex.secondaryMuscles.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>Secundários</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ex.secondaryMuscles.map((m) => (
                          <span key={m} className={`badge ${injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-gray"}`}>
                            {MUSCLE_PT[m] ?? m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {ex.instructions && ex.instructions.length > 0 && (
            <div className="card p-4">
              <p className="section-label mb-3">Como executar</p>
              <ol className="space-y-3">
                {(ex.instructions_pt ?? ex.instructions).map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-[var(--color-primary)] font-bold shrink-0 w-5">{i + 1}.</span>
                    <span className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {step.replace(/^Step:\d+\s*/i, "")}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="section-label">
                Séries{doneSetsCount > 0 && ` — ${doneSetsCount}/${sets.length} feitas`}
              </p>
              {doneSetsCount > 0 && (
                <button onClick={resetSets} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                  Reiniciar
                </button>
              )}
            </div>

            {allDone && (
              <div className="bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] rounded-xl p-3 flex items-center justify-center gap-2">
                <Trophy size={16} className="text-[var(--color-primary)]" />
                <p className="text-[var(--color-primary)] font-semibold text-sm">Exercício concluído!</p>
              </div>
            )}

            {restTimeLeft !== null && !allDone && (
              <RestTimerOverlay remaining={restTimeLeft} total={SHEET_REST_SECS} onSkip={() => setRestTimeLeft(null)} />
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="w-7 shrink-0" />
                <span className="text-xs text-[var(--color-text-muted)] w-8 text-center">#</span>
                <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">Peso (kg)</span>
                <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">Repetições</span>
                <span className="w-8 shrink-0" />
              </div>

              {sets.map((set, idx) => (
                <div key={set.id} className={`flex items-center gap-2 rounded-xl px-1 py-1.5 transition-all ${set.done ? "opacity-50" : ""}`}>
                  <button
                    onClick={() => toggleSet(set.id)}
                    aria-label={`Marcar série ${set.id} concluída`}
                    aria-pressed={set.done}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      set.done
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {set.done && <span className="text-xs font-bold">✓</span>}
                  </button>
                  <span className="text-xs text-[var(--color-text-muted)] w-8 text-center">{idx + 1}</span>
                  <input type="number" inputMode="decimal" placeholder="—"
                    aria-label={`Peso série ${set.id} (kg)`}
                    value={set.weight}
                    onChange={(e) => updateSet(set.id, "weight", e.target.value)}
                    className={`input flex-1 text-center py-2 ${set.done ? "opacity-50" : ""}`}
                  />
                  <input type="number" inputMode="numeric" placeholder={SHEET_DEFAULT_REPS}
                    aria-label={`Repetições série ${set.id}`}
                    value={set.reps}
                    onChange={(e) => updateSet(set.id, "reps", e.target.value)}
                    className={`input flex-1 text-center py-2 ${set.done ? "opacity-50" : ""}`}
                  />
                  <button onClick={() => { const updated = sets.filter((s) => s.id !== set.id); setSets(updated); syncSession(updated); }}
                    className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-lg">
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addSet}
              className="w-full border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded-xl py-2.5 text-sm transition-colors">
              + Adicionar série
            </button>
          </div>

          {ex.musclewikiUrl && (
            <div className="pb-2">
              <a href={ex.musclewikiUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs transition-colors" style={{ color: "var(--color-text-muted)" }}>
                Ver no MuscleWiki ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
