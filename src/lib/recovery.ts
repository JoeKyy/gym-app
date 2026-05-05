/**
 * recovery.ts — Fitbod-style muscle freshness model.
 *
 * Each muscle group has a base recovery window (hours). After a training session,
 * freshness starts at 0% and climbs linearly to 100% over the recovery window.
 * Volume (sets) extends the effective window proportionally.
 *
 * Sources:
 * - Kraemer & Ratamess (2004). Fundamentals of Resistance Training. Medicine & Science in Sports.
 * - Ahtiainen et al. (2003). Muscle hypertrophy, hormonal adaptations. EJAP.
 * - Schoenfeld (2010). The mechanisms of muscle hypertrophy. Journal of Strength & Conditioning.
 * - EMG Muscle Recovery Dataset (Levsha, 2025) — rest interval classification for vastus lateralis.
 */

import type {
  Exercise,
  Injury,
  MuscleGroup,
  MuscleRecoveryStatus,
  WorkoutSession,
} from "./types";

// ─── Recovery Windows (hours) ─────────────────────────────────────────────────

/**
 * Base recovery windows per muscle group.
 * Range values: [min hours, max hours at high volume]
 */
export const MUSCLE_RECOVERY_WINDOWS: Record<MuscleGroup, [number, number]> = {
  biceps:     [24, 36],
  triceps:    [24, 36],
  calves:     [24, 36],
  forearms:   [24, 36],
  chest:      [40, 52],
  shoulders:  [40, 52],
  core:       [40, 52],
  quadriceps: [48, 72],
  hamstrings: [48, 72],
  glutes:     [48, 72],
  lats:       [48, 60],
  upper_back: [48, 60],
  lower_back: [60, 80],
};

/**
 * Injury multiplier: when a muscle's adjacent injury is active,
 * the recovery window is extended by this factor.
 */
const INJURY_WINDOW_MULTIPLIER: Record<string, number> = {
  acute:      2.0,   // double the window when acute
  subacute:   1.5,   // 50% longer in subacute
  chronic:    1.25,  // 25% longer in chronic
  recovered:  1.0,
};

// ─── Muscle name → group mapping ──────────────────────────────────────────────

/**
 * Maps MuscleWiki / exercise data muscle names to canonical MuscleGroup keys.
 * Case-insensitive, partial-match friendly.
 */
const MUSCLE_GROUP_MAP: Array<[RegExp, MuscleGroup]> = [
  [/bicep|brachii|brachialis|curl/i,                          "biceps"],
  [/tricep/i,                                                  "triceps"],
  [/calf|calves|gastrocnemius|soleus/i,                        "calves"],
  [/forearm|wrist|brachioradialis/i,                           "forearms"],
  [/pec|chest|pectoral/i,                                      "chest"],
  [/delt|shoulder|rotator|infraspinatus|supraspinatus/i,       "shoulders"],
  [/abs|abdominal|oblique|core|transverse/i,                   "core"],
  [/quad|rectus femoris|vastus/i,                              "quadriceps"],
  [/hamstring|bicep femoris|semimembranosus|semitendinosus/i,  "hamstrings"],
  [/glute|gluteus|hip abductor|hip adductor|piriformis/i,      "glutes"],
  [/lat|latissimus/i,                                          "lats"],
  [/trap|rhomboid|rear delt|upper back|teres/i,                "upper_back"],
  [/lower back|erector|lumbar|multifidus|spine|iliopsoas/i,    "lower_back"],
];

export function normalizeMuscle(name: string): MuscleGroup | null {
  for (const [re, group] of MUSCLE_GROUP_MAP) {
    if (re.test(name)) return group;
  }
  return null;
}

/** Which muscle groups are affected by each injury condition */
const INJURY_MUSCLE_GROUPS: Record<string, MuscleGroup[]> = {
  "hernia-lombar":        ["lower_back", "core", "glutes", "hamstrings"],
  "hernia-cervical":      ["upper_back", "shoulders"],
  "tendinite-patelar":    ["quadriceps"],
  "sfp":                  ["quadriceps", "glutes"],
  "manguito-rotador":     ["shoulders"],
  "epicondilite-lateral": ["forearms"],
  "epicondilite-medial":  ["forearms"],
  "sindrome-it":          ["glutes", "quadriceps"],
  "artrite-joelho":       ["quadriceps", "hamstrings"],
};

// ─── Freshness calculation ────────────────────────────────────────────────────

interface MuscleLoad {
  fatigueUnits: number; // primary sets × 1.0 + secondary sets × 0.5
  lastTrainedAt: number; // unix ms
}

/**
 * Compute the effective recovery window (hours) for a muscle group,
 * applying injury multipliers for adjacent injuries.
 */
export function getMuscleRecoveryHours(
  group: MuscleGroup,
  injuries: Injury[],
  fatigueUnits: number
): number {
  const [minH, maxH] = MUSCLE_RECOVERY_WINDOWS[group];

  // Volume scale: 3 sets = min window, 12+ sets = max window
  const volumeFactor = Math.min(1, Math.max(0, (fatigueUnits - 3) / 9));
  let base = minH + (maxH - minH) * volumeFactor;

  // Apply injury multiplier (highest applies)
  let multiplier = 1.0;
  for (const inj of injuries) {
    const affected = INJURY_MUSCLE_GROUPS[inj.conditionId] ?? [];
    if (affected.includes(group)) {
      const m = INJURY_WINDOW_MULTIPLIER[inj.phase] ?? 1.0;
      if (m > multiplier) multiplier = m;
    }
  }

  return base * multiplier;
}

/**
 * Calculate Fitbod-style freshness for all muscle groups
 * based on recent workout sessions.
 *
 * Returns an array of MuscleRecoveryStatus, one per group that has been trained.
 * Groups with no recent training are omitted (they are implicitly 100% fresh).
 */
export function calculateFreshness(
  sessions: WorkoutSession[],
  exercisesMap: Map<string, Exercise>,
  injuries: Injury[],
  nowMs: number = Date.now()
): MuscleRecoveryStatus[] {
  // Accumulate fatigue per group from sessions in the last 7 days
  const cutoff = nowMs - 7 * 24 * 60 * 60 * 1000;
  const groupLoads = new Map<MuscleGroup, MuscleLoad>();

  for (const session of sessions) {
    const sessionMs = new Date(session.startedAt).getTime();
    if (sessionMs < cutoff) continue;

    for (const log of session.exercises) {
      const ex = exercisesMap.get(log.exerciseId);
      if (!ex) continue;

      const completedSets = log.sets.filter((s) => s.completed).length || log.sets.length;

      // Primary muscles: weight 1.0
      for (const m of ex.targetMuscles) {
        const group = normalizeMuscle(m);
        if (!group) continue;
        const prev = groupLoads.get(group);
        if (!prev || sessionMs > prev.lastTrainedAt) {
          groupLoads.set(group, {
            fatigueUnits: (prev?.fatigueUnits ?? 0) + completedSets * 1.0,
            lastTrainedAt: Math.max(sessionMs, prev?.lastTrainedAt ?? 0),
          });
        } else {
          groupLoads.set(group, {
            fatigueUnits: prev.fatigueUnits + completedSets * 1.0,
            lastTrainedAt: prev.lastTrainedAt,
          });
        }
      }

      // Secondary muscles: weight 0.5
      for (const m of ex.secondaryMuscles) {
        const group = normalizeMuscle(m);
        if (!group) continue;
        const prev = groupLoads.get(group);
        const newUnits = (prev?.fatigueUnits ?? 0) + completedSets * 0.5;
        const newTs = Math.max(sessionMs, prev?.lastTrainedAt ?? 0);
        groupLoads.set(group, { fatigueUnits: newUnits, lastTrainedAt: newTs });
      }
    }
  }

  const result: MuscleRecoveryStatus[] = [];

  for (const [group, load] of groupLoads) {
    const windowHours = getMuscleRecoveryHours(group, injuries, load.fatigueUnits);
    const windowMs = windowHours * 60 * 60 * 1000;
    const elapsedMs = nowMs - load.lastTrainedAt;
    const freshnessPct = Math.min(100, Math.round((elapsedMs / windowMs) * 100));
    const hoursRemaining = Math.max(
      0,
      Math.round((windowMs - elapsedMs) / (60 * 60 * 1000))
    );

    result.push({
      group,
      freshnessPct,
      hoursRemaining,
      lastTrainedAt: new Date(load.lastTrainedAt).toISOString(),
      status: freshnessPct >= 80 ? "ready" : freshnessPct >= 30 ? "partial" : "resting",
    });
  }

  // Sort: resting first, then partial, then ready; within same status by freshnessPct asc
  const ORDER = { resting: 0, partial: 1, ready: 2 };
  result.sort((a, b) =>
    ORDER[a.status] !== ORDER[b.status]
      ? ORDER[a.status] - ORDER[b.status]
      : a.freshnessPct - b.freshnessPct
  );

  return result;
}

// ─── Smart focus recommendation ──────────────────────────────────────────────

/** Human-readable group labels in Portuguese */
export const GROUP_LABELS: Record<MuscleGroup, string> = {
  biceps:     "Bíceps",
  triceps:    "Tríceps",
  calves:     "Panturrilha",
  forearms:   "Antebraço",
  chest:      "Peitoral",
  shoulders:  "Ombros",
  core:       "Core",
  quadriceps: "Quadríceps",
  hamstrings: "Isquiotibiais",
  glutes:     "Glúteos",
  lats:       "Dorsais",
  upper_back: "Costas Superiores",
  lower_back: "Lombar",
};

const UPPER_GROUPS: MuscleGroup[] = ["chest", "shoulders", "lats", "upper_back", "biceps", "triceps"];
const LOWER_GROUPS: MuscleGroup[] = ["quadriceps", "hamstrings", "glutes", "calves"];
const CORE_GROUPS: MuscleGroup[]  = ["core", "lower_back"];

/**
 * Given freshness data, suggest which workout focus makes most sense today.
 * Returns null if there is no history to reason from.
 */
export function recommendFocusFromFreshness(
  statuses: MuscleRecoveryStatus[]
): { focus: "upper" | "lower" | "core" | "full_body"; reason: string } | null {
  if (statuses.length === 0) return null;

  const avg = (groups: MuscleGroup[]) => {
    const relevant = statuses.filter((s) => groups.includes(s.group));
    if (relevant.length === 0) return 100; // no data = assume fresh
    return relevant.reduce((sum, s) => sum + s.freshnessPct, 0) / relevant.length;
  };

  const upperAvg = avg(UPPER_GROUPS);
  const lowerAvg = avg(LOWER_GROUPS);
  const coreAvg  = avg(CORE_GROUPS);

  const best = Math.max(upperAvg, lowerAvg, coreAvg);

  if (best < 40) {
    return { focus: "full_body", reason: "Todos os grupos precisam de mais descanso — treino leve recomendado" };
  }
  if (upperAvg === best) {
    return { focus: "upper", reason: `Parte superior com ${Math.round(upperAvg)}% de recuperação` };
  }
  if (lowerAvg === best) {
    return { focus: "lower", reason: `Parte inferior com ${Math.round(lowerAvg)}% de recuperação` };
  }
  return { focus: "core", reason: `Core com ${Math.round(coreAvg)}% de recuperação` };
}
