import { readFileSync } from "fs";
import { join } from "path";
import ExercisePageClient from "./ExercisePageClient";

export async function generateStaticParams() {
  const filePath = join(process.cwd(), "public", "data", "exercises.json");
  const exercises = JSON.parse(readFileSync(filePath, "utf-8")) as { slug: string }[];
  return exercises.map((ex) => ({ slug: ex.slug }));
}

export default function ExercisePage() {
  return <ExercisePageClient />;
}
