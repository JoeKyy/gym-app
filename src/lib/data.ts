import type { Exercise } from "./types";
import { applyEquipmentCorrections } from "./exercise-corrections";

let _exercises: Exercise[] | null = null;

export async function getExercises(): Promise<Exercise[]> {
  if (_exercises) return _exercises;

  try {
    const res = await fetch("/data/exercises.json");
    if (!res.ok) throw new Error("Failed to load exercises");
    const raw = await res.json();
    if (!Array.isArray(raw) || !raw.every((e: unknown) =>
      typeof e === "object" && e !== null &&
      typeof (e as Record<string, unknown>).id === "string" &&
      Array.isArray((e as Record<string, unknown>).targetMuscles)
    )) {
      console.warn("[data] exercises.json has unexpected shape, using empty fallback");
      return [];
    }
    _exercises = applyEquipmentCorrections(raw as Exercise[]);
    return _exercises;
  } catch {
    console.warn("exercises.json not found — returning empty list");
    return [];
  }
}

export function filterExercises(
  exercises: Exercise[],
  opts: {
    search?: string;
    bodyPart?: string;
    equipment?: string;
    environment?: string;
    injuredMuscles?: string[];
    hideRisky?: boolean;
    calisthenicsOnly?: boolean;
  }
): Exercise[] {
  const { search, bodyPart, equipment, environment, injuredMuscles = [], hideRisky, calisthenicsOnly } = opts;

  // Equipment sets per environment — handles both wger (lowercase) and MuscleWiki (capitalized) names
  const ENV_EQUIPMENT: Record<string, string[]> = {
    home: ["body weight", "bodyweight", "resistance band", "band", "dumbbell", "dumbbells", "kettlebell", "kettlebells", "stability ball", "stretches"],
    gym: [], // all
    pilates: ["pilates", "stability ball", "body weight", "bodyweight", "resistance band", "band", "roller", "yoga", "bosu-ball", "trx"],
  };

  // Normalize equipment string for matching
  const normalizeEq = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, "");

  return exercises.filter((ex) => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (bodyPart && !ex.bodyParts.some((b) => b.toLowerCase() === bodyPart.toLowerCase())) return false;
    // Calisthenics: bodyweight category only (excludes recovery/stretches/yoga)
    if (calisthenicsOnly && (ex.category ?? "").toLowerCase() !== "bodyweight") return false;
    if (equipment) {
      const eqNorm = normalizeEq(equipment);
      if (!ex.equipments.some((e) => normalizeEq(e) === eqNorm || normalizeEq(e).includes(eqNorm) || eqNorm.includes(normalizeEq(e)))) return false;
    }

    if (environment && environment !== "any" && environment !== "all") {
      const allowed = ENV_EQUIPMENT[environment];
      if (allowed && allowed.length > 0) {
        // Also match by MuscleWiki category field (e.g. category="pilates", "yoga", "stretches")
        const catMatch = ex.category && allowed.some((a) => normalizeEq(ex.category ?? "").includes(normalizeEq(a)) || normalizeEq(a).includes(normalizeEq(ex.category ?? "")));
        const equipMatch = ex.equipments.some((e) =>
          allowed.some((a) => normalizeEq(e).includes(normalizeEq(a)) || normalizeEq(a).includes(normalizeEq(e)))
        );
        if (!catMatch && !equipMatch) return false;
      }
    }

    if (hideRisky && injuredMuscles.length > 0) {
      const riskyMuscles = [
        ...ex.targetMuscles,
        ...ex.secondaryMuscles,
        ...(ex.tertiaryMuscles ?? []),
      ].map((m) => m.toLowerCase());
      const isRisky = injuredMuscles.some((im) =>
        riskyMuscles.some((m) => m.includes(im.toLowerCase()) || im.toLowerCase().includes(m))
      );
      if (isRisky) return false;
    }

    return true;
  });
}

export function isExerciseRisky(exercise: Exercise, injuredMuscles: string[]): boolean {
  if (!injuredMuscles.length) return false;
  const involved = [
    ...exercise.targetMuscles,
    ...exercise.secondaryMuscles,
    ...(exercise.tertiaryMuscles ?? []),
  ].map((m) => m.toLowerCase());
  return injuredMuscles.some((im) => involved.some((m) => m.includes(im.toLowerCase()) || im.toLowerCase().includes(m)));
}
