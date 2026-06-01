import type { Exercise } from "./types";
import { applyEquipmentCorrections } from "./exercise-corrections";
import { adaptAll, type RawExercise } from "./exercises/free-exercise-db";
import { complementaryToExercise } from "./exercises/adapter";

let _exercises: Exercise[] | null = null;

/** Normaliza nome para dedup: lowercase, só alfanumérico. */
function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function getExercises(): Promise<Exercise[]> {
  if (_exercises) return _exercises;

  // ── 1. Curados ──────────────────────────────────────────────────────────
  let curated: Exercise[] = [];
  try {
    const res = await fetch("/data/exercises.json");
    if (!res.ok) throw new Error("Failed to load exercises");
    const raw = await res.json();
    if (
      !Array.isArray(raw) ||
      !raw.every(
        (e: unknown) =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as Record<string, unknown>).id === "string" &&
          Array.isArray((e as Record<string, unknown>).targetMuscles)
      )
    ) {
      console.warn("[data] exercises.json has unexpected shape, using empty fallback");
    } else {
      curated = applyEquipmentCorrections(raw as Exercise[]);
    }
  } catch {
    console.warn("exercises.json not found — returning empty list");
  }

  // ── 2. Complementares — merge silencioso ─────────────────────────────
  try {
    const res = await fetch("/data/free-exercise-db.json");
    if (res.ok) {
      const raw = (await res.json()) as RawExercise[];
      const complementary = adaptAll(raw);

      // Índice rápido por nome normalizado para dedup
      const byName = new Map<string, Exercise>();
      for (const ex of curated) byName.set(normalizeName(ex.name), ex);

      for (const ce of complementary) {
        if (ce.safety.level === "avoid") continue; // nunca incluir
        const key = normalizeName(ce.n);
        const existing = byName.get(key);
        if (existing) {
          // Enrich: gifUrl, images, name_pt e spinalLoad se curado não tiver
          if (!existing.gifUrl && ce.images[0]) {
            existing.gifUrl = ce.images[0];
            if (!existing.mediaType || existing.mediaType === "none") {
              (existing as Exercise & { mediaType: string }).mediaType = "gif";
            }
          }
          if (!existing.images && ce.images.length > 0) {
            existing.images = ce.images;
          }
          if (!existing.name_pt && ce.name_pt) {
            existing.name_pt = ce.name_pt;
          }
          if (!existing.instructions_pt && ce.instructions_pt) {
            existing.instructions_pt = ce.instructions_pt;
          }
          if (!existing.spinalLoad) {
            existing.spinalLoad =
              ce.safety.level === "safe" ? "low" : "medium";
          }
          if (existing.isRehabSafe === undefined) {
            existing.isRehabSafe = ce.safety.level === "safe";
          }
        } else {
          // Novo exercício — converter e adicionar
          const converted = complementaryToExercise(ce);
          curated.push(converted);
          byName.set(key, converted);
        }
      }
    }
  } catch {
    // Complementar é opcional — falha silenciosa
  }

  _exercises = curated;
  return _exercises;
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
