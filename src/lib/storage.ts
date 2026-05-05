import type { InjuredMuscle, Injury, Workout, WeeklyPlan, WorkoutSession } from "./types";

const KEYS = {
  injuries: "gymapp:injuries",
  injuries_v2: "gymapp:injuries_v2",
  workouts: "gymapp:workouts",
  plans: "gymapp:plans",
  activePlanId: "gymapp:activePlanId",
  sessions: "gymapp:sessions",
  equipment: "gymapp:equipment",
} as const;

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Injuries (v1 — legacy, keeps backward compat) ───────────────────────────

export function getInjuries(): InjuredMuscle[] {
  return load<InjuredMuscle[]>(KEYS.injuries, []);
}

export function saveInjuries(injuries: InjuredMuscle[]): void {
  save(KEYS.injuries, injuries);
}

// ─── Injuries (v2 — clinical model) ──────────────────────────────────────────

export function getInjuriesV2(): Injury[] {
  return load<Injury[]>(KEYS.injuries_v2, []);
}

export function saveInjuryV2(injury: Injury): void {
  const injuries = getInjuriesV2().filter((i) => i.id !== injury.id);
  save(KEYS.injuries_v2, [...injuries, injury]);
}

export function deleteInjuryV2(id: string): void {
  save(KEYS.injuries_v2, getInjuriesV2().filter((i) => i.id !== id));
}

export function updateInjuryV2(id: string, updates: Partial<Injury>): void {
  const injuries = getInjuriesV2().map((i) =>
    i.id === id ? { ...i, ...updates } : i
  );
  save(KEYS.injuries_v2, injuries);
}

// ─── Workouts ────────────────────────────────────────────────────────────────

export function getWorkouts(): Workout[] {
  return load<Workout[]>(KEYS.workouts, []);
}

export function getWorkout(id: string): Workout | undefined {
  return getWorkouts().find((w) => w.id === id);
}

export function saveWorkout(workout: Workout): void {
  const workouts = getWorkouts().filter((w) => w.id !== workout.id);
  save(KEYS.workouts, [...workouts, workout]);
}

export function deleteWorkout(id: string): void {
  save(KEYS.workouts, getWorkouts().filter((w) => w.id !== id));
}

// ─── Weekly Plans ────────────────────────────────────────────────────────────

export function getPlans(): WeeklyPlan[] {
  return load<WeeklyPlan[]>(KEYS.plans, []);
}

export function getPlan(id: string): WeeklyPlan | undefined {
  return getPlans().find((p) => p.id === id);
}

export function savePlan(plan: WeeklyPlan): void {
  const plans = getPlans().filter((p) => p.id !== plan.id);
  save(KEYS.plans, [...plans, plan]);
}

export function deletePlan(id: string): void {
  save(KEYS.plans, getPlans().filter((p) => p.id !== id));
}

export function getActivePlanId(): string | null {
  return load<string | null>(KEYS.activePlanId, null);
}

export function setActivePlanId(id: string | null): void {
  save(KEYS.activePlanId, id);
}

// ─── Workout Sessions (Progress Tracking) ────────────────────────────────────

export function getSessions(): WorkoutSession[] {
  return load<WorkoutSession[]>(KEYS.sessions, []);
}

export function saveSession(session: WorkoutSession): void {
  const sessions = getSessions().filter((s) => s.id !== session.id);
  save(KEYS.sessions, [...sessions, session]);
}

export function deleteSession(id: string): void {
  save(KEYS.sessions, getSessions().filter((s) => s.id !== id));
}

// ─── Equipment Profile ────────────────────────────────────────────────────────
// Default: Bodyweight always available

export function getEquipmentProfile(): string[] {
  return load<string[]>(KEYS.equipment, []);
}

export function saveEquipmentProfile(ids: string[]): void {
  save(KEYS.equipment, ids);
}

export function getRecentSessions(days = 7): WorkoutSession[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return getSessions().filter(
    (s) => new Date(s.startedAt) >= cutoff
  );
}

export function getPersonalRecord(
  exerciseId: string
): { reps: number | string; weight?: number; date: string } | null {
  const sessions = getSessions();
  let best: { reps: number | string; weight?: number; date: string } | null = null;

  for (const session of sessions) {
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        if (!set.completed) continue;
        const weight = set.weight ?? 0;
        if (!best || weight > (best.weight ?? 0)) {
          best = { reps: set.reps, weight: set.weight, date: session.date };
        }
      }
    }
  }
  return best;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function now(): string {
  return new Date().toISOString();
}
