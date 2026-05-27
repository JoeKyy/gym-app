"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useInjuries } from "@/hooks/useInjuries";
import { getExercises, filterExercises } from "@/lib/data";
import { saveSession, generateId, now as nowISO } from "@/lib/storage";
import ExerciseMedia from "@/components/ExerciseMedia";
import ExerciseCard from "@/components/ExerciseCard";
import type { Exercise, Workout, ExerciseSet, WorkoutSession, ExerciseLog, SetLog } from "@/lib/types";

const DEFAULT_SET: ExerciseSet = { sets: 3, reps: 12, rest: 60 };
const ENV_ICON: Record<string, string> = { home: "🏠", gym: "🏋", pilates: "🧘", any: "⚡" };
const ENV_LABEL: Record<string, string> = { home: "Casa", gym: "Academia", pilates: "Pilates/Mobilidade", any: "Qualquer" };

// ─── Active Session Types ─────────────────────────────────────────────────────

interface SetState {
  reps: string;
  weight: string;
  completed: boolean;
}
interface ExerciseSessionState { sets: SetState[]; }
type SessionLogs = Record<string, ExerciseSessionState>;

function initSessionLogs(workout: Workout): SessionLogs {
  const logs: SessionLogs = {};
  for (const { exerciseId, config } of workout.exercises) {
    logs[exerciseId] = {
      sets: Array.from({ length: config.sets }, () => ({
        reps: String(config.reps),
        weight: "",
        completed: false,
      })),
    };
  }
  return logs;
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Active Set Row ───────────────────────────────────────────────────────────

function ActiveSetRow({ setNum, state, onChange, defaultReps }: {
  setNum: number; state: SetState; defaultReps: string;
  onChange: (s: SetState) => void;
}) {
  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
      state.completed ? "bg-[var(--color-success-bg)] border border-[var(--color-success-border)]" : "bg-[var(--color-surface-2)]"
    }`}>
      <button
        onClick={() => onChange({ ...state, completed: !state.completed })}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
          state.completed
            ? "bg-[var(--color-success)] border-[var(--color-success)] text-black"
            : "border-[var(--color-border)] text-transparent"
        }`}
      >✓</button>

      <span className="text-xs font-semibold w-5 shrink-0 text-center" style={{ color: "var(--color-text-muted)" }}>
        {setNum}
      </span>

      <input
        type="number" inputMode="decimal" placeholder="—"
        value={state.weight}
        onChange={(e) => onChange({ ...state, weight: e.target.value })}
        className="input text-xs text-center py-1 px-1 w-14 shrink-0"
      />
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>kg</span>

      <input
        type="text" inputMode="numeric"
        placeholder={defaultReps}
        value={state.reps}
        onChange={(e) => onChange({ ...state, reps: e.target.value })}
        className="input text-xs text-center py-1 px-1 w-14 shrink-0"
      />
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>reps</span>
    </div>
  );
}

// ─── Active Exercise Card ─────────────────────────────────────────────────────

function ActiveExerciseCard({ ex, config, sessionState, onChange }: {
  ex: Exercise; config: ExerciseSet;
  sessionState: ExerciseSessionState;
  onChange: (s: ExerciseSessionState) => void;
}) {
  const doneSets = sessionState.sets.filter((s) => s.completed).length;
  const allDone = doneSets === sessionState.sets.length;

  const markAll = () => {
    onChange({ sets: sessionState.sets.map((s) => ({ ...s, completed: !allDone })) });
  };

  return (
    <div className={`rounded-2xl overflow-hidden border transition-colors ${
      allDone ? "border-[var(--color-success-border)]" : "border-[var(--color-border)]"
    }`} style={{ background: "var(--color-surface)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
          <ExerciseMedia exercise={ex} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate capitalize" style={{ color: "var(--color-text)" }}>
            {ex.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: allDone ? "var(--color-success-text)" : "var(--color-text-muted)" }}>
            {allDone ? "✓ Concluído" : `${doneSets}/${config.sets} séries`} · alvo {config.reps} reps
          </p>
        </div>
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

      {/* Sets */}
      <div className="px-3 pb-3 space-y-1.5 border-t pt-2.5" style={{ borderColor: "var(--color-border)" }}>
        {sessionState.sets.map((setS, i) => (
          <ActiveSetRow
            key={i} setNum={i + 1} state={setS}
            defaultReps={String(config.reps)}
            onChange={(ns) => {
              const newSets = [...sessionState.sets];
              newSets[i] = ns;
              onChange({ sets: newSets });
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Finish Modal ─────────────────────────────────────────────────────────────

function FinishModal({
  workout, sessionLogs, exerciseMap, startedAt, elapsed,
  onSave, onCancel,
}: {
  workout: Workout;
  sessionLogs: SessionLogs;
  exerciseMap: Map<string, Exercise>;
  startedAt: string;
  elapsed: number;
  onSave: (rating: number | null, notes: string) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
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
          {/* Title */}
          <div className="text-center">
            <p className="text-3xl mb-1">🎉</p>
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Treino concluído!</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{workout.name}</p>
          </div>

          {/* Stats */}
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

          {/* Muscles */}
          {muscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>
                💪 Músculos trabalhados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {muscles.map((m) => (
                  <span key={m} className="badge badge-gray text-[11px] capitalize">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Como foi o treino?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(rating === n ? null : n)}
                  className={`flex-1 py-2 rounded-xl text-xl transition-all ${
                    rating !== null && n <= rating ? "opacity-100 scale-110" : "opacity-40"
                  }`}>
                  {n <= 2 ? "😓" : n === 3 ? "😐" : n === 4 ? "💪" : "🔥"}
                </button>
              ))}
            </div>
            {rating && (
              <p className="text-xs text-center mt-1" style={{ color: "var(--color-text-muted)" }}>
                {rating <= 2 ? "Pesado, mas valeu!" : rating === 3 ? "Treino sólido" : rating === 4 ? "Ótimo treino!" : "Treino incrível! 🔥"}
              </p>
            )}
          </div>

          {/* Notes */}
          <textarea
            placeholder="Observações (opcional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input text-sm py-2.5 w-full resize-none"
            style={{ background: "var(--color-surface-2)" }}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="btn btn-secondary flex-1">
              Continuar
            </button>
            <button onClick={() => onSave(rating, notes)}
              className="btn btn-primary flex-1 font-semibold">
              Salvar treino ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Mode: Exercise Row ──────────────────────────────────────────────────

function WorkoutExerciseRow({
  ex, config, idx, total, risky,
  onRemove, onMove, onUpdate,
}: {
  ex: Exercise; config: ExerciseSet; idx: number; total: number; risky: boolean;
  onRemove: () => void; onMove: (dir: -1 | 1) => void; onUpdate: (p: Partial<ExerciseSet>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl overflow-hidden transition-colors ${risky ? "border border-[var(--color-danger-border)]" : "border border-[var(--color-border)]"}`}
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
            {ex.targetMuscles.slice(0, 3).join(", ")}
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
              <span style={{ color: "var(--color-text-secondary)" }}>Reps</span>
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
        </div>
      )}
    </div>
  );
}

// ─── Exercise Picker Modal ────────────────────────────────────────────────────

function ExercisePicker({
  allExercises, search, onSearchChange,
  hideRisky, onHideRiskyToggle,
  respectEnv, onRespectEnvToggle,
  hasEnvFilter, hasInjuries,
  results, onAdd, onClose,
}: {
  allExercises: Exercise[]; search: string; onSearchChange: (s: string) => void;
  hideRisky: boolean; onHideRiskyToggle: () => void;
  respectEnv: boolean; onRespectEnvToggle: () => void;
  hasEnvFilter: boolean; hasInjuries: boolean;
  results: Exercise[]; onAdd: (ex: Exercise) => void; onClose: () => void;
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkoutEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") ?? "";
  const { workouts, updateWorkout } = useWorkouts();
  const { injuredMuscleNames, isRisky } = useInjuries();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [hideRisky, setHideRisky] = useState(false);
  const [respectEnv, setRespectEnv] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);

  // ── Session mode state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<"edit" | "session">("edit");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLogs>({});
  const [elapsed, setElapsed] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { getExercises().then(setAllExercises); }, []);

  useEffect(() => {
    const found = workouts.find((w) => w.id === id);
    if (found) setWorkout(found);
  }, [workouts, id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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

  // ── Session mode handlers ───────────────────────────────────────────────────

  const handleStartSession = useCallback(() => {
    if (!workout) return;
    setSessionLogs(initSessionLogs(workout));
    setSessionStartedAt(nowISO());
    setElapsed(0);
    setMode("session");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [workout]);

  const handleExitSession = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setMode("edit");
    setSessionLogs({});
    setSessionStartedAt(null);
    setElapsed(0);
    setShowFinish(false);
  }, []);

  const handleSaveSession = useCallback((rating: number | null, notes: string) => {
    if (!workout || !sessionStartedAt) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const exerciseLogs: ExerciseLog[] = Object.entries(sessionLogs)
      .filter(([, state]) => state.sets.some((s) => s.completed))
      .map(([exerciseId, state]) => ({
        exerciseId,
        sets: state.sets.map<SetLog>((s) => ({
          reps: isNaN(Number(s.reps)) ? s.reps : Number(s.reps),
          weight: s.weight ? parseFloat(s.weight) : undefined,
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
      durationMinutes: Math.max(1, Math.round(elapsed / 60)),
      exercises: exerciseLogs,
      rating: (rating as WorkoutSession["rating"]) ?? undefined,
      notes: notes || undefined,
    };

    saveSession(session);
    router.push("/progress");
  }, [workout, sessionStartedAt, sessionLogs, elapsed, router]);

  const updateSetLog = useCallback((exerciseId: string, newState: ExerciseSessionState) => {
    setSessionLogs((prev) => ({ ...prev, [exerciseId]: newState }));
  }, []);

  // ── Guards ──────────────────────────────────────────────────────────────────

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
          elapsed={elapsed} onSave={handleSaveSession} onCancel={() => setShowFinish(false)}
        />
      )}

      <div className="space-y-5 pb-32">
        {/* Header */}
        <div className="flex items-start gap-3">
          {mode === "edit" ? (
            <Link href="/workouts" className="text-lg mt-0.5 leading-none"
              style={{ color: "var(--color-text-muted)" }}>←</Link>
          ) : (
            <button onClick={handleExitSession} className="text-lg mt-0.5 leading-none"
              style={{ color: "var(--color-text-muted)" }}>←</button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{workout.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {ENV_ICON[workout.environment]} {ENV_LABEL[workout.environment]} · {workout.exercises.length} exercício{workout.exercises.length !== 1 ? "s" : ""}
              {riskyCount > 0 && <span className="ml-2 text-[var(--color-danger)]">⚠ {riskyCount} arriscado{riskyCount !== 1 ? "s" : ""}</span>}
              {mode === "session" && (
                <span className="ml-2 font-mono font-semibold" style={{ color: "var(--color-primary)" }}>
                  ⏱ {formatElapsed(elapsed)}
                </span>
              )}
            </p>
          </div>

          {/* Start session button (edit mode only) */}
          {mode === "edit" && workout.exercises.length > 0 && (
            <button onClick={handleStartSession} className="btn btn-primary shrink-0 text-sm">
              ▶ Iniciar
            </button>
          )}
        </div>

        {/* Session mode progress bar */}
        {mode === "session" && workout.exercises.length > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              <span>{completedInSession}/{workout.exercises.length} exercícios</span>
              <span>{Math.round((completedInSession / workout.exercises.length) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: "var(--color-success)",
                  width: `${(completedInSession / workout.exercises.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Exercise list */}
        {workout.exercises.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🏋</p>
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Nenhum exercício</p>
            <p className="text-sm mt-1 mb-4" style={{ color: "var(--color-text-muted)" }}>Adicione exercícios ao seu treino</p>
            <button onClick={() => setShowPicker(true)} className="btn btn-primary">+ Adicionar exercício</button>
          </div>
        ) : mode === "edit" ? (
          <div className="space-y-2">
            {workout.exercises.map(({ exerciseId, config }, idx) => {
              const ex = exerciseMap.get(exerciseId);
              if (!ex) return null;
              return (
                <WorkoutExerciseRow key={exerciseId}
                  ex={ex} config={config} idx={idx} total={workout.exercises.length}
                  risky={isRisky(ex)}
                  onRemove={() => removeExercise(exerciseId)}
                  onMove={(dir) => moveExercise(exerciseId, dir)}
                  onUpdate={(p) => updateConfig(exerciseId, p)}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {workout.exercises.map(({ exerciseId, config }) => {
              const ex = exerciseMap.get(exerciseId);
              const state = sessionLogs[exerciseId];
              if (!ex || !state) return null;
              return (
                <ActiveExerciseCard key={exerciseId}
                  ex={ex} config={config}
                  sessionState={state}
                  onChange={(ns) => updateSetLog(exerciseId, ns)}
                />
              );
            })}
          </div>
        )}

        {/* Edit mode: add button */}
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

      {/* Sticky bottom bar — session mode only */}
      {mode === "session" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center px-4 pt-5 pb-4"
          style={{ background: "linear-gradient(to top, var(--color-bg) 75%, transparent)" }}>
          <div className="w-full max-w-3xl">
            <button
              onClick={() => setShowFinish(true)}
              disabled={completedInSession === 0}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
