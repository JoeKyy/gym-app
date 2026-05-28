import type { InjuredMuscle, Injury, Workout, WeeklyPlan, WorkoutSession, UserProfile, ExercisePreference, ExercisePreferenceState } from "./types";

const KEYS = {
  injuries: "gymapp:injuries",
  injuries_v2: "gymapp:injuries_v2",
  workouts: "gymapp:workouts",
  plans: "gymapp:plans",
  activePlanId: "gymapp:activePlanId",
  sessions: "gymapp:sessions",
  equipment: "gymapp:equipment",
  profile: "gymapp:profile",
  exPreferences: "gymapp:exercise_preferences",
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

// ─── User Profile ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  goal: "general_fitness",
  experienceLevel: "intermediate",
  split: "full_body",
  durationMinutes: 60,
  units: "kg",
  bodyStats: {},
};

export function getProfile(): UserProfile {
  return load<UserProfile>(KEYS.profile, DEFAULT_PROFILE);
}

export function saveProfile(profile: UserProfile): void {
  save(KEYS.profile, profile);
}

// ─── 1RM Estimation (Epley formula) ──────────────────────────────────────────

/** Epley: estimated 1RM = weight × (1 + reps/30). Min 1 rep, min 0 weight. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export interface EstimatedStrength {
  exerciseId: string;
  estimated1RM: number;
  weight: number;
  reps: number | string;
  date: string;
}

/** Returns the best estimated 1RM for an exercise across all sessions. */
export function getBestEstimated1RM(exerciseId: string): EstimatedStrength | null {
  let best: EstimatedStrength | null = null;
  for (const session of getSessions()) {
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        if (!set.completed) continue;
        const reps = typeof set.reps === "number" ? set.reps : parseInt(String(set.reps));
        if (isNaN(reps) || reps <= 0) continue;
        const w = set.weight ?? 0;
        const e1rm = epley1RM(w, reps);
        if (!best || e1rm > best.estimated1RM) {
          best = { exerciseId, estimated1RM: e1rm, weight: w, reps: set.reps, date: session.date };
        }
      }
    }
  }
  return best;
}

/** Returns estimated 1RM history (one entry per session) for an exercise. */
export function getStrengthHistory(exerciseId: string): { date: string; estimated1RM: number }[] {
  const history: { date: string; estimated1RM: number }[] = [];
  const sessions = getSessions().sort((a, b) => a.date.localeCompare(b.date));
  for (const session of sessions) {
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      let bestInSession = 0;
      for (const set of log.sets) {
        if (!set.completed) continue;
        const reps = typeof set.reps === "number" ? set.reps : parseInt(String(set.reps));
        if (isNaN(reps) || reps <= 0) continue;
        const w = set.weight ?? 0;
        const e = epley1RM(w, reps);
        if (e > bestInSession) bestInSession = e;
      }
      if (bestInSession > 0) {
        history.push({ date: session.date, estimated1RM: bestInSession });
      }
    }
  }
  return history;
}

/** Returns top N exercises by highest estimated 1RM. */
export function getTopStrengthExercises(n = 8): EstimatedStrength[] {
  const sessions = getSessions();
  const map = new Map<string, EstimatedStrength>();
  for (const session of sessions) {
    for (const log of session.exercises) {
      for (const set of log.sets) {
        if (!set.completed) continue;
        const reps = typeof set.reps === "number" ? set.reps : parseInt(String(set.reps));
        if (isNaN(reps) || reps <= 0) continue;
        const w = set.weight ?? 0;
        const e1rm = epley1RM(w, reps);
        const prev = map.get(log.exerciseId);
        if (!prev || e1rm > prev.estimated1RM) {
          map.set(log.exerciseId, { exerciseId: log.exerciseId, estimated1RM: e1rm, weight: w, reps: set.reps, date: session.date });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.estimated1RM - a.estimated1RM).slice(0, n);
}

// ─── Auto-Progression Suggestion ─────────────────────────────────────────────

/**
 * Returns a load progression suggestion if the last 2 sessions containing this
 * exercise (both with RiR ≤ 1) had a consistent weight — suggesting the user
 * is ready to increase load.
 */
export function getProgressionSuggestion(exerciseId: string): { suggestedIncrease: number; lastWeight: number } | null {
  const sessions = getSessions()
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId) && s.rir !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  if (sessions.length < 2) return null;
  if (!sessions.every((s) => (s.rir ?? 99) <= 1)) return null;

  const lastLog = sessions[0].exercises.find((e) => e.exerciseId === exerciseId);
  if (!lastLog) return null;

  const weights = lastLog.sets
    .filter((s) => s.completed && s.weight !== undefined && (s.weight as number) > 0)
    .map((s) => s.weight as number);

  if (weights.length === 0) return null;
  const lastWeight = Math.max(...weights);

  return { suggestedIncrease: 2.5, lastWeight };
}

/** Batch-computes personal relevance scores for all exercises seen in sessions or with preferences.
 *  Single pass through sessions for efficiency.
 *  Score components: frequency (0-30) + recent PR (0-20) + avg RiR (0-15) + preference (-100/±10)
 */
export function getExerciseScoreMap(): Map<string, number> {
  const sessions = getSessions();
  const prefs = getExercisePreferences();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const freqMap = new Map<string, number>();
  const rirMap = new Map<string, number[]>();
  const best1RMAll = new Map<string, number>();
  const best1RMRecent = new Map<string, number>();

  for (const session of sessions) {
    const recent90 = session.date >= ninetyDaysAgo;
    const recent30 = session.date >= thirtyDaysAgo;

    for (const log of session.exercises) {
      const id = log.exerciseId;

      if (recent90) {
        freqMap.set(id, (freqMap.get(id) ?? 0) + 1);
        if (session.rir !== undefined) {
          const arr = rirMap.get(id) ?? [];
          arr.push(session.rir);
          rirMap.set(id, arr);
        }
      }

      for (const set of log.sets) {
        if (!set.completed) continue;
        const reps = typeof set.reps === "number" ? set.reps : parseInt(String(set.reps));
        if (isNaN(reps) || reps <= 0) continue;
        const e = epley1RM(set.weight ?? 0, reps);
        if (e > (best1RMAll.get(id) ?? 0)) best1RMAll.set(id, e);
        if (recent30 && e > (best1RMRecent.get(id) ?? 0)) best1RMRecent.set(id, e);
      }
    }
  }

  const allIds = new Set([...freqMap.keys(), ...prefs.keys()]);
  const scoreMap = new Map<string, number>();

  for (const id of allIds) {
    const pref = prefs.get(id);
    if (pref === "excluded") { scoreMap.set(id, -100); continue; }

    const freq = freqMap.get(id) ?? 0;
    const frequencyScore = Math.min(freq * 3, 30);

    const allBest = best1RMAll.get(id) ?? 0;
    const recentBest = best1RMRecent.get(id) ?? 0;
    const prScore = allBest > 0 && recentBest >= allBest ? 20 : 0;

    const rirs = rirMap.get(id) ?? [];
    let rirScore = 0;
    if (rirs.length > 0) {
      const avg = rirs.reduce((a, b) => a + b, 0) / rirs.length;
      rirScore = avg <= 1 ? 15 : avg <= 3 ? 10 : 5;
    }

    const prefScore = pref === "more" ? 10 : pref === "less" ? -10 : 0;
    const total = frequencyScore + prScore + rirScore + prefScore;
    if (total !== 0) scoreMap.set(id, total);
  }

  return scoreMap;
}

// ─── Exercise Preferences ─────────────────────────────────────────────────────

export function getExercisePreferences(): Map<string, ExercisePreferenceState> {
  const arr = load<ExercisePreference[]>(KEYS.exPreferences, []);
  return new Map(arr.map((p) => [p.exerciseId, p.state]));
}

export function setExercisePreference(exerciseId: string, state: ExercisePreferenceState): void {
  const prefs = load<ExercisePreference[]>(KEYS.exPreferences, []).filter((p) => p.exerciseId !== exerciseId);
  if (state !== "default") prefs.push({ exerciseId, state });
  save(KEYS.exPreferences, prefs);
}

export function getExercisePreference(exerciseId: string): ExercisePreferenceState {
  return getExercisePreferences().get(exerciseId) ?? "default";
}
