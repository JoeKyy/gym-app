/**
 * Workout Generator — creates a balanced workout plan from available exercises.
 * Considers: equipment, target muscles, difficulty, injuries, and exercise variety.
 */

import type { Exercise, Workout, ExerciseSet } from "./types";
import { generateId, now } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrainingFocus =
  | "full_body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "core"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "glutes"
  | "legs";

export type TrainingGoal = "strength" | "hypertrophy" | "endurance" | "mobility";

export interface GeneratorOptions {
  equipment: string[];         // IDs from equipment.ts
  focus: TrainingFocus;
  goal: TrainingGoal;
  difficulty: "beginner" | "intermediate" | "advanced";
  exerciseCount: number;       // 4 | 6 | 8 | 10
  avoidMuscles: string[];      // muscles to exclude (from injury profile)
  scoreMap?: Map<string, number>; // personal relevance scores
}

export interface GeneratedExercise {
  exerciseId: string;
  exercise: Exercise;          // full exercise object for display
  config: ExerciseSet;
}

export interface GeneratedWorkout {
  name: string;
  exercises: GeneratedExercise[];
  totalSets: number;
  estimatedMinutes: number;
}

// ─── Configuration ────────────────────────────────────────────────────────────

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  full_body: "Corpo Inteiro",
  upper: "Membros Superiores",
  lower: "Membros Inferiores",
  push: "Empurrar (Push)",
  pull: "Puxar (Pull)",
  core: "Core / Abdômen",
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  arms: "Braços",
  glutes: "Glúteos",
  legs: "Pernas",
};

export const GOAL_LABELS: Record<TrainingGoal, string> = {
  strength: "Força",
  hypertrophy: "Hipertrofia",
  endurance: "Resistência",
  mobility: "Mobilidade",
};

/** Muscle groups associated with each focus */
const FOCUS_MUSCLES: Record<TrainingFocus, string[]> = {
  full_body: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Abs"],
  upper: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Abs"],
  lower: ["Quads", "Hamstrings", "Glutes", "Calves", "Hip Flexors"],
  push: ["Chest", "Shoulders", "Triceps"],
  pull: ["Back", "Biceps", "Forearms", "Rear Delts"],
  core: ["Abs", "Obliques", "Lower Back", "Hip Flexors"],
  chest: ["Chest", "Triceps", "Shoulders"],
  back: ["Back", "Biceps", "Forearms"],
  shoulders: ["Shoulders", "Triceps", "Traps"],
  arms: ["Biceps", "Triceps", "Forearms"],
  glutes: ["Glutes", "Hamstrings", "Hip Flexors"],
  legs: ["Quads", "Hamstrings", "Glutes", "Calves"],
};

/** Primary muscles for focus (the ones we prioritize) */
const FOCUS_PRIMARY_MUSCLES: Record<TrainingFocus, string[]> = {
  full_body: ["Chest", "Quads", "Back", "Shoulders", "Glutes"],
  upper: ["Chest", "Back", "Shoulders"],
  lower: ["Quads", "Hamstrings", "Glutes"],
  push: ["Chest", "Shoulders", "Triceps"],
  pull: ["Back", "Biceps"],
  core: ["Abs", "Obliques"],
  chest: ["Chest"],
  back: ["Back"],
  shoulders: ["Shoulders"],
  arms: ["Biceps", "Triceps"],
  glutes: ["Glutes"],
  legs: ["Quads", "Hamstrings", "Glutes"],
};

/** Sets × reps per goal + difficulty */
function getPrescription(goal: TrainingGoal, difficulty: string): ExerciseSet {
  const base: Record<TrainingGoal, { sets: number; reps: number | string; rest: number }> = {
    strength:     { sets: 4, reps: "4-6",   rest: 120 },
    hypertrophy:  { sets: 3, reps: "8-12",  rest: 90 },
    endurance:    { sets: 3, reps: "15-20", rest: 45 },
    mobility:     { sets: 2, reps: "hold 30s", rest: 30 },
  };
  const preset = base[goal];
  // Advanced: +1 set
  if (difficulty === "advanced") return { ...preset, sets: preset.sets + 1 };
  // Beginner: -1 set, less reps
  if (difficulty === "beginner") {
    const reps = goal === "hypertrophy" ? "8-10" : goal === "endurance" ? "12-15" : preset.reps;
    return { ...preset, sets: Math.max(2, preset.sets - 1), reps };
  }
  return preset;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreExercise(ex: Exercise, targetMuscles: string[], isFirst: boolean, personalScore = 0): number {
  let score = 0;

  // Primary target muscles hit
  const primaryHits = ex.targetMuscles.filter((m) =>
    targetMuscles.some((t) => m.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(m.toLowerCase()))
  ).length;
  score += primaryHits * 10;

  // Compound exercises get a bonus (especially for the first slots)
  if (ex.mechanic === "compound") score += isFirst ? 15 : 5;

  // Has video → better UX
  if (ex.videoUrls && Object.keys(ex.videoUrls).length > 0) score += 3;

  // Personal usage score boost (max ±15 influence to avoid overriding muscle targeting)
  score += Math.min(Math.max(personalScore * 0.3, -15), 15);

  // Slight randomization to add variety
  score += Math.random() * 4;

  return score;
}

// ─── Core Generator ───────────────────────────────────────────────────────────

export function generateWorkout(
  exercises: Exercise[],
  opts: GeneratorOptions
): GeneratedWorkout {
  const { equipment, focus, goal, difficulty, exerciseCount, avoidMuscles, scoreMap } = opts;

  // Normalise avoid list for case-insensitive comparison
  const avoid = avoidMuscles.map((m) => m.toLowerCase());

  // 1. Equipment filter — always allow Bodyweight
  const equipmentPool = exercises.filter((ex) => {
    if (!ex.equipments || ex.equipments.length === 0) return true;
    const equipsLower = ex.equipments.map((e) => e.toLowerCase());
    const allowedLower = [...equipment, "Bodyweight"].map((e) => e.toLowerCase());
    return equipsLower.some((e) => allowedLower.includes(e));
  });

  // 2. Difficulty filter (flexible — allows one level up/down)
  const difficultyPool = equipmentPool.filter((ex) => {
    if (!ex.difficulty) return true;
    const d = ex.difficulty.toLowerCase().replace("novice", "beginner");
    if (difficulty === "beginner") return d === "beginner" || d === "novice";
    if (difficulty === "advanced") return d === "intermediate" || d === "advanced";
    return true; // intermediate sees all
  });

  // Fallback if too few exercises
  const pool = difficultyPool.length >= exerciseCount ? difficultyPool : equipmentPool;

  // 3. Injury / muscle avoid filter
  const safePool = pool.filter((ex) => {
    const muscles = [
      ...ex.targetMuscles.map((m) => m.toLowerCase()),
      ...ex.secondaryMuscles.map((m) => m.toLowerCase()),
    ];
    return !muscles.some((m) => avoid.some((a) => m.includes(a) || a.includes(m)));
  });

  const finalPool = safePool.length >= exerciseCount ? safePool : pool;

  // 4. Pick exercises by focus
  const targetMuscles = FOCUS_MUSCLES[focus] ?? [];
  const primaryMuscles = FOCUS_PRIMARY_MUSCLES[focus] ?? [];

  // Sort pool by relevance to focus + personal score
  const scored = finalPool
    .map((ex, _, arr) => ({
      ex,
      score: scoreExercise(ex, targetMuscles, arr.indexOf(ex) < 3, scoreMap?.get(ex.id) ?? 0),
    }))
    .sort((a, b) => b.score - a.score);

  // 5. Greedy selection — avoid repeating same primary muscle
  const selected: Exercise[] = [];
  const usedPrimary = new Map<string, number>();

  // First pass: fill with primary focus muscles (compounds preferred)
  const compoundFirst = scored.filter((s) => s.ex.mechanic === "compound");
  const isolations = scored.filter((s) => s.ex.mechanic !== "compound");

  const ordered = [...compoundFirst, ...isolations];

  for (const { ex } of ordered) {
    if (selected.length >= exerciseCount) break;
    if (selected.some((s) => s.id === ex.id)) continue;

    // Limit same primary muscle to avoid imbalance
    const key = ex.targetMuscles[0]?.toLowerCase() ?? "other";
    const currentCount = usedPrimary.get(key) ?? 0;
    const maxPerMuscle = focus === "full_body" ? 1 : Math.ceil(exerciseCount / primaryMuscles.length || 2);

    if (currentCount >= maxPerMuscle && selected.length < Math.floor(exerciseCount * 0.7)) {
      continue; // defer — try to fill other muscles first
    }

    // Only count exercises that actually target this focus
    const hitsTarget = ex.targetMuscles.some((m) =>
      targetMuscles.some((t) => m.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(m.toLowerCase()))
    );

    if (!hitsTarget && selected.length < exerciseCount * 0.5) continue;

    selected.push(ex);
    usedPrimary.set(key, currentCount + 1);
  }

  // Second pass: fill remaining slots with any safe exercise
  if (selected.length < exerciseCount) {
    for (const { ex } of scored) {
      if (selected.length >= exerciseCount) break;
      if (selected.some((s) => s.id === ex.id)) continue;
      selected.push(ex);
    }
  }

  // 6. Map to GeneratedExercise with prescription
  const prescription = getPrescription(goal, difficulty);
  const generatedExercises: GeneratedExercise[] = selected.map((ex) => ({
    exerciseId: ex.id,
    exercise: ex,
    config: prescription,
  }));

  // 7. Estimate duration
  const perExercise = prescription.sets * (45 + prescription.rest); // ~45s per set + rest
  const estimatedMinutes = Math.round((generatedExercises.length * perExercise) / 60);

  return {
    name: buildWorkoutName(focus, goal),
    exercises: generatedExercises,
    totalSets: generatedExercises.length * prescription.sets,
    estimatedMinutes,
  };
}

function buildWorkoutName(focus: TrainingFocus, goal: TrainingGoal): string {
  const focusLabel = FOCUS_LABELS[focus] ?? focus;
  const goalLabel = GOAL_LABELS[goal] ?? goal;
  return `${focusLabel} — ${goalLabel}`;
}

/** Convert a GeneratedWorkout into a saveable Workout object */
export function generatedToWorkout(gw: GeneratedWorkout): Workout {
  const ts = now();
  return {
    id: generateId(),
    name: gw.name,
    environment: "any",
    createdAt: ts,
    updatedAt: ts,
    exercises: gw.exercises.map((ge) => ({
      exerciseId: ge.exerciseId,
      config: ge.config,
    })),
  };
}

// ─── Workout name suggestions ─────────────────────────────────────────────────

export const FOCUS_OPTIONS: { id: TrainingFocus; label: string; emoji: string; muscles: string[] }[] = [
  { id: "full_body",  label: "Corpo Inteiro",         emoji: "⚡", muscles: [] },
  { id: "upper",     label: "Superior",               emoji: "💪", muscles: ["Chest", "Back", "Shoulders", "Arms"] },
  { id: "lower",     label: "Inferior",               emoji: "🦵", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"] },
  { id: "push",      label: "Push (Empurrar)",        emoji: "🫸", muscles: ["Chest", "Shoulders", "Triceps"] },
  { id: "pull",      label: "Pull (Puxar)",           emoji: "🫷", muscles: ["Back", "Biceps"] },
  { id: "core",      label: "Core",                   emoji: "🎯", muscles: ["Abs", "Obliques"] },
  { id: "chest",     label: "Peito",                  emoji: "🏋️", muscles: ["Chest"] },
  { id: "back",      label: "Costas",                 emoji: "🔙", muscles: ["Back"] },
  { id: "shoulders", label: "Ombros",                 emoji: "🔝", muscles: ["Shoulders"] },
  { id: "arms",      label: "Braços",                 emoji: "💪", muscles: ["Biceps", "Triceps"] },
  { id: "glutes",    label: "Glúteos",                emoji: "🍑", muscles: ["Glutes"] },
  { id: "legs",      label: "Pernas",                 emoji: "🦵", muscles: ["Quads", "Hamstrings"] },
];

export const GOAL_OPTIONS: { id: TrainingGoal; label: string; emoji: string; description: string }[] = [
  { id: "hypertrophy", label: "Hipertrofia",  emoji: "📈", description: "3×8-12 reps, foco em volume e tensão" },
  { id: "strength",    label: "Força",        emoji: "🏆", description: "4×4-6 reps, cargas máximas" },
  { id: "endurance",   label: "Resistência",  emoji: "⏱️", description: "3×15-20 reps, menos descanso" },
  { id: "mobility",    label: "Mobilidade",   emoji: "🧘", description: "2×hold 30s, foco em amplitude" },
];
