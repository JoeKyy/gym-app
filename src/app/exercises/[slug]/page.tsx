import { readFileSync } from "fs";
import { join } from "path";
import ExercisePageClient from "./ExercisePageClient";
import { adaptAll, type RawExercise } from "@/lib/exercises/free-exercise-db";

export async function generateStaticParams() {
  const dataDir = join(process.cwd(), "public", "data");

  // Curated slugs
  const curated = JSON.parse(
    readFileSync(join(dataDir, "exercises.json"), "utf-8")
  ) as { slug: string }[];
  const slugSet = new Set(curated.map((e) => e.slug));

  // Free-exercise-db slugs (safe + caution only, no avoid)
  try {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "free-exercise-db.json"), "utf-8")
    ) as RawExercise[];
    const complementary = adaptAll(raw);
    for (const ce of complementary) {
      if (ce.safety.level === "avoid") continue;
      slugSet.add(ce.slug);
    }
  } catch {
    // optional — build still works without it
  }

  return Array.from(slugSet).map((slug) => ({ slug }));
}

export default function ExercisePage() {
  return <ExercisePageClient />;
}
