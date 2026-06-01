/**
 * adapter.ts
 * Converte ComplementaryExercise → Exercise (formato curado do GymApp).
 * Exercícios "avoid" NUNCA devem ser passados por aqui — guard explícito.
 */

import type { Exercise } from "@/lib/types";
import type { ComplementaryExercise } from "./free-exercise-db";

export function complementaryToExercise(ce: ComplementaryExercise): Exercise {
  if (ce.safety.level === "avoid") {
    throw new Error(`complementaryToExercise: "${ce.n}" classificado como avoid — não incluir no treino.`);
  }

  return {
    id: `fed_${ce.slug}`,
    name: ce.n,
    slug: ce.slug,
    source: "free-exercise-db" as const,
    difficulty: ce.level,
    force: ce.force ?? undefined,
    mechanic: ce.mechanic ?? undefined,
    targetMuscles: ce.primaryMuscles,
    secondaryMuscles: ce.secondaryMuscles,
    bodyParts: ce.primaryMuscles,
    equipments: ce.eq ? [ce.eq] : [],
    mediaType: ce.images.length > 0 ? "gif" : "none",
    gifUrl: ce.images[0] ?? undefined,
    instructions: ce.steps,
    spinalLoad:
      ce.safety.level === "safe"
        ? "low"
        : ce.safety.level === "caution"
        ? "medium"
        : "high",
    isRehabSafe: ce.safety.level === "safe",
  };
}
