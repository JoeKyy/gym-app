"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useInjuries } from "@/hooks/useInjuries";
import { getExercises, filterExercises } from "@/lib/data";
import { saveSession, generateId, now as nowISO } from "@/lib/storage";
import { parseNum } from "@/lib/parse";
import { Dumbbell, Home, Zap, Timer, Play, ChevronLeft } from "lucide-react";
import type { Exercise, Workout, ExerciseSet, WorkoutSession, ExerciseLog, SetLog } from "@/lib/types";
import { useRestTimer } from "./hooks/useRestTimer";
import { useSessionLogs } from "./hooks/useSessionLogs";
import { RestTimerOverlay } from "./components/RestTimerOverlay";
import { WorkoutExerciseRow } from "./components/WorkoutExerciseRow";
import { ExercisePicker } from "./components/ExercisePicker";
import { ActiveExerciseCard } from "./components/ActiveExerciseCard";
import { FinishModal } from "./components/FinishModal";
import { ExerciseDetailSheet } from "./components/ExerciseDetailSheet";
import { ElapsedBadge } from "./components/ElapsedBadge";

const DEFAULT_SET: ExerciseSet = { sets: 3, reps: 12, rest: 60 };
const ENV_ICON: Record<string, React.ReactNode> = {
  home:    <Home    size={20} />,
  gym:     <Dumbbell size={20} />,
  pilates: <Zap    size={20} />,
  any:     <Zap    size={20} />,
};
const ENV_LABEL: Record<string, string> = { home: "Casa", gym: "Academia", pilates: "Pilates/Mobilidade", any: "Qualquer" };

// ─── Active Session Types ─────────────────────────────────────────────────────

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkoutEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") ?? "";
  const { workouts, hydrated, updateWorkout } = useWorkouts();
  const { injuredMuscleNames, isRisky } = useInjuries();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [hideRisky, setHideRisky] = useState(false);
  const [respectEnv, setRespectEnv] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);

  // ── Session mode state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<"edit" | "session">("edit");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const { sessionLogs, setSessionLogs, initLogs, updateSetLog, clearLogs } = useSessionLogs();
  const [showFinish, setShowFinish] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { restTimer, startRestTimer, skipRestTimer, clearOnUnmount } = useRestTimer();

  useEffect(() => { getExercises().then(setAllExercises); }, []);

  useEffect(() => {
    const found = workouts.find((w) => w.id === id);
    if (found) setWorkout(found);
  }, [workouts, id]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearOnUnmount();
    };
  }, [clearOnUnmount]);

  const searchResults = useMemo(() =>
    filterExercises(allExercises, {
      search,
      environment: workout && respectEnv && workout.environment !== "any" ? workout.environment : undefined,
      injuredMuscles: injuredMuscleNames,
      hideRisky,
    }),
    [allExercises, search, workout, respectEnv, injuredMuscleNames, hideRisky]
  );

  const exerciseMap = useMemo(
    () => new Map(allExercises.map((e) => [e.id, e])),
    [allExercises]
  );

  // ── Edit mode handlers ──────────────────────────────────────────────────────

  const addExercise = useCallback((ex: Exercise) => {
    setWorkout((prev) => {
      if (!prev || prev.exercises.find((we) => we.exerciseId === ex.id)) return prev;
      const updated: Workout = { ...prev, exercises: [...prev.exercises, { exerciseId: ex.id, config: { ...DEFAULT_SET } }] };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const removeExercise = useCallback((exerciseId: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const updated: Workout = { ...prev, exercises: prev.exercises.filter((we) => we.exerciseId !== exerciseId) };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const updateConfig = useCallback((exerciseId: string, patch: Partial<ExerciseSet>) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const updated: Workout = {
        ...prev,
        exercises: prev.exercises.map((we) =>
          we.exerciseId === exerciseId ? { ...we, config: { ...we.config, ...patch } } : we
        ),
      };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const moveExercise = useCallback((exerciseId: string, direction: -1 | 1) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const idx = prev.exercises.findIndex((we) => we.exerciseId === exerciseId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.exercises.length) return prev;
      const items = [...prev.exercises];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      const updated: Workout = { ...prev, exercises: items };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const toggleSuperset = useCallback((idx: number) => {
    setWorkout((prev) => {
      if (!prev || idx >= prev.exercises.length - 1) return prev;
      const items = [...prev.exercises];
      const a = items[idx];
      const b = items[idx + 1];
      let updatedItems: typeof items;
      if (a.supersetGroupId && a.supersetGroupId === b.supersetGroupId) {
        // remove pairing
        updatedItems = items.map((we, i) =>
          i === idx || i === idx + 1 ? { ...we, supersetGroupId: undefined } : we
        );
      } else {
        const groupId = generateId();
        updatedItems = items.map((we, i) =>
          i === idx || i === idx + 1 ? { ...we, supersetGroupId: groupId } : we
        );
      }
      const updated: Workout = { ...prev, exercises: updatedItems };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  // ── Session mode handlers ───────────────────────────────────────────────────

  const handleStartSession = useCallback(() => {
    if (!workout) return;
    initLogs(workout);
    setSessionStartedAt(nowISO());
    setMode("session");
  }, [initLogs, workout]);

  const handleExitSession = useCallback(() => {
    skipRestTimer();
    setMode("edit");
    clearLogs();
    setSessionStartedAt(null);
    setShowFinish(false);
  }, [clearLogs, skipRestTimer]);

  const handleSaveSession = useCallback((rating: number | null, rir: number | null, notes: string) => {
    if (!workout || !sessionStartedAt) return;

    const computedElapsed = Math.floor((Date.now() - Date.parse(sessionStartedAt)) / 1000);
    const validIds = new Set(workout.exercises.map((e) => e.exerciseId));
    const exerciseLogs: ExerciseLog[] = Object.entries(sessionLogs)
      .filter(([exerciseId, state]) => validIds.has(exerciseId) && state.sets.some((s) => s.completed))
      .map(([exerciseId, state]) => ({
        exerciseId,
        sets: state.sets.map<SetLog>((s) => ({
          reps: isNaN(Number(s.reps)) ? s.reps : Number(s.reps),
          weight: parseNum(s.weight) ?? undefined,
          completed: s.completed,
        })),
      }));

    const session: WorkoutSession = {
      id: generateId(),
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString().slice(0, 10),
      startedAt: sessionStartedAt,
      finishedAt: nowISO(),
      durationMinutes: Math.max(1, Math.round(computedElapsed / 60)),
      exercises: exerciseLogs,
      rating: (rating as WorkoutSession["rating"]) ?? undefined,
      rir: rir ?? undefined,
      notes: notes || undefined,
    };

    const ok = saveSession(session);
    if (!ok) {
      setSaveError("Não foi possível salvar o treino. Armazenamento cheio — libere espaço e tente novamente.");
      return;
    }
    router.push("/progress");
  }, [workout, sessionStartedAt, sessionLogs, router]);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!hydrated) {
    return (
      <div className="text-center py-20" style={{ color: "var(--color-text-muted)" }}>
        <div className="flex justify-center mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
        </div>
        <p>Carregando...</p>
      </div>
    );
  }
  if (!workout) {
    return <div className="text-center py-20" style={{ color: "var(--color-text-muted)" }}>Treino não encontrado</div>;
  }

  const riskyCount = workout.exercises.filter(({ exerciseId }) => {
    const ex = exerciseMap.get(exerciseId);
    return ex ? isRisky(ex) : false;
  }).length;

  const completedInSession = mode === "session"
    ? Object.values(sessionLogs).filter((s) => s.sets.some((st) => st.completed)).length
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {saveError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold"
          style={{ background: "var(--color-danger, #ef4444)", color: "white" }}>
          ⚠️ {saveError}
          <button onClick={() => setSaveError(null)} className="ml-3 underline text-xs">fechar</button>
        </div>
      )}
      {detailEx && (
        <ExerciseDetailSheet
          ex={detailEx} onClose={() => setDetailEx(null)} injuredMuscleNames={injuredMuscleNames}
          sessionState={sessionLogs[detailEx.id]}
          onSessionChange={(s) => setSessionLogs((prev) => ({ ...prev, [detailEx.id]: s }))}
        />
      )}

      {showPicker && (
        <ExercisePicker
          allExercises={allExercises} search={search} onSearchChange={setSearch}
          hideRisky={hideRisky} onHideRiskyToggle={() => setHideRisky((v) => !v)}
          respectEnv={respectEnv} onRespectEnvToggle={() => setRespectEnv((v) => !v)}
          hasEnvFilter={workout.environment !== "any"}
          hasInjuries={injuredMuscleNames.length > 0}
          results={searchResults} onAdd={addExercise} onClose={() => setShowPicker(false)}
        />
      )}

      {showFinish && sessionStartedAt && (
        <FinishModal
          workout={workout} sessionLogs={sessionLogs}
          exerciseMap={exerciseMap} startedAt={sessionStartedAt}
          elapsed={Math.floor((Date.now() - Date.parse(sessionStartedAt)) / 1000)}
          onSave={handleSaveSession} onCancel={() => setShowFinish(false)}
        />
      )}

      {/* ── Hero + Content ──────────────────────────────────────────────────── */}
      <div className="-mx-4 -mt-5">

        {/* Hero banner — design system gradients, no video */}
        <div className="relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, var(--color-primary-soft-strong) 0%, var(--color-surface-2) 100%)", borderBottom: "1px solid var(--color-border)" }}>

          {/* Back button */}
          {mode === "edit" ? (
            <Link href="/workouts"
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center shadow"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <button onClick={handleExitSession}
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center shadow"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <ChevronLeft size={20} />
            </button>
          )}

          <div className="px-4 pt-14 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Treino
                </p>
                <h1 className="text-2xl font-bold leading-tight truncate" style={{ color: "var(--color-text)" }}>{workout.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="badge badge-gray flex items-center gap-1">
                    {ENV_ICON[workout.environment]}{ENV_LABEL[workout.environment]}
                  </span>
                  <span className="badge badge-gray">
                    {workout.exercises.length} exercício{workout.exercises.length !== 1 ? "s" : ""}
                  </span>
                  {riskyCount > 0 && (
                    <span className="badge badge-red">⚠ {riskyCount} arriscado{riskyCount !== 1 ? "s" : ""}</span>
                  )}
                  {mode === "session" && sessionStartedAt && (
                    <span className="badge flex items-center gap-1" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)" }}>
                      <Timer size={11} /><span className="font-mono"><ElapsedBadge startedAt={sessionStartedAt} /></span>
                    </span>
                  )}
                </div>
              </div>
              {mode === "edit" && workout.exercises.length > 0 && (
                <button onClick={handleStartSession} className="btn btn-primary shrink-0 flex items-center gap-1.5">
                  <Play size={14} />Iniciar
                </button>
              )}
            </div>

            {/* Session progress bar */}
            {mode === "session" && workout.exercises.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  <span>{completedInSession}/{workout.exercises.length} exercícios</span>
                  <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
                    {Math.round((completedInSession / workout.exercises.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: "var(--color-success)", width: `${(completedInSession / workout.exercises.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-5 space-y-5 pb-32">
          {/* Exercise list */}
          {workout.exercises.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="flex justify-center mb-3"><Dumbbell size={40} style={{ color: "var(--color-text-muted)", opacity: 0.3 }} /></div>
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>Nenhum exercício</p>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--color-text-muted)" }}>Adicione exercícios ao seu treino</p>
              <button onClick={() => setShowPicker(true)} className="btn btn-primary">+ Adicionar exercício</button>
            </div>
          ) : mode === "edit" ? (
            <div className="space-y-2">
              {workout.exercises.map(({ exerciseId, config, supersetGroupId }, idx) => {
                const ex = exerciseMap.get(exerciseId);
                if (!ex) return null;
                const nextEx = workout.exercises[idx + 1];
                const isStart = !!(supersetGroupId && nextEx?.supersetGroupId === supersetGroupId);
                const isMember = !!(supersetGroupId && (
                  isStart ||
                  (idx > 0 && workout.exercises[idx - 1]?.supersetGroupId === supersetGroupId)
                ));
                return (
                  <div key={exerciseId}>
                    <WorkoutExerciseRow
                      ex={ex} config={config} idx={idx} total={workout.exercises.length}
                      risky={isRisky(ex)}
                      isInSuperset={isMember}
                      isStartOfSuperset={isStart}
                      onRemove={() => removeExercise(exerciseId)}
                      onMove={(dir) => moveExercise(exerciseId, dir)}
                      onUpdate={(p) => updateConfig(exerciseId, p)}
                      onToggleSuperset={idx < workout.exercises.length - 1 ? () => toggleSuperset(idx) : undefined}
                    />
                    {isStart && (
                      <div className="flex items-center gap-2 py-1 px-3">
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ color: "var(--color-primary)", background: "var(--color-primary-soft)" }}>
                          superset
                        </span>
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {workout.exercises.map(({ exerciseId, config, supersetGroupId }, idx) => {
                const ex = exerciseMap.get(exerciseId);
                const state = sessionLogs[exerciseId];
                if (!ex || !state) return null;
                const nextEx = workout.exercises[idx + 1];
                const isFirstInSuperset = !!(supersetGroupId && nextEx?.supersetGroupId === supersetGroupId);
                const prevEx = workout.exercises[idx - 1];
                const isSecondInSuperset = !!(supersetGroupId && prevEx?.supersetGroupId === supersetGroupId);
                const restOverride = isFirstInSuperset ? 15 : undefined;
                return (
                  <div key={exerciseId}>
                    {isSecondInSuperset && (
                      <div className="flex items-center gap-2 py-1 px-1">
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ color: "var(--color-primary)", background: "var(--color-primary-soft)" }}>
                          superset
                        </span>
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                      </div>
                    )}
                    <ActiveExerciseCard
                      ex={ex} config={config}
                      sessionState={state}
                      onChange={(ns) => updateSetLog(exerciseId, ns)}
                      onViewDetail={() => setDetailEx(ex)}
                      onSetCompleted={(secs) => startRestTimer(restOverride ?? secs)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit mode: add more exercises */}
          {mode === "edit" && workout.exercises.length > 0 && (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-colors border border-dashed hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              + Adicionar exercício
            </button>
          )}
        </div>
      </div>

      {/* Sticky bottom bar — session mode only */}
      {mode === "session" && (
        <div
          className="fixed left-0 right-0 z-40 flex justify-center px-4 pt-3 pb-4"
          style={{
            bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
            background: "linear-gradient(to top, var(--color-bg) 85%, transparent)",
          }}
        >
          <div className="w-full max-w-3xl space-y-2">
            {/* Rest timer (shown above finish button) */}
            {restTimer && (
              <RestTimerOverlay
                remaining={restTimer.remaining}
                total={restTimer.total}
                onSkip={skipRestTimer}
              />
            )}
            <button
              onClick={() => setShowFinish(true)}
              disabled={completedInSession === 0}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: completedInSession > 0 ? "var(--color-primary)" : "var(--color-surface-2)",
                color: completedInSession > 0 ? "var(--color-primary-text)" : "var(--color-text-muted)",
              }}
            >
              {completedInSession === 0
                ? "Complete ao menos 1 exercício"
                : `✓ Finalizar treino (${completedInSession}/${workout.exercises.length})`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Compact row for an exercise in the workout list */
