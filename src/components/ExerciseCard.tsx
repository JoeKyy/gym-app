"use client";
import Link from "next/link";
import type { Exercise } from "@/lib/types";
import { EQUIPMENT_PT } from "@/lib/translations";
import ExerciseMedia from "@/components/ExerciseMedia";

interface Props {
  exercise: Exercise;
  isRisky?: boolean;
  onAddToWorkout?: (exercise: Exercise) => void;
}

const DIFF_LABEL: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  expert: "Avançado",
  advanced: "Avançado",
};

export default function ExerciseCard({ exercise, isRisky, onAddToWorkout }: Props) {
  const diffBadge =
    exercise.difficulty === "beginner" ? "badge badge-green" :
    exercise.difficulty === "intermediate" ? "badge badge-amber" :
    exercise.difficulty ? "badge badge-red" : null;

  return (
    <div
      className={`card card-interactive overflow-hidden
                  flex flex-col
                  sm:flex-row
                  ${isRisky ? "border-[var(--color-danger-border)]" : ""}`}
    >
      {/* Media — mobile: full-width top, desktop: fixed-width left column */}
      <div className="sm:shrink-0 sm:self-stretch">
        <Link href={`/exercises/${exercise.slug}`} className="block">
          <ExerciseMedia
            exercise={exercise}
            risky={isRisky}
            className="w-full h-[200px] sm:h-full sm:w-[clamp(130px,30%,210px)]"
          />
        </Link>
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between p-3 sm:p-4 flex-1 min-w-0 gap-2">
        <div className="min-w-0">
          <Link
            href={`/exercises/${exercise.slug}`}
            className="font-bold text-sm sm:text-base leading-snug line-clamp-2
                       hover:text-[var(--color-primary)] transition-colors"
            style={{ color: "var(--color-text)" }}
          >
            {exercise.name}
          </Link>

          {exercise.bodyParts.length > 0 && (
            <p className="text-[11px] font-semibold mt-0.5 uppercase tracking-wide"
              style={{ color: "var(--color-primary)" }}>
              {exercise.bodyParts.slice(0, 2).join(" · ")}
            </p>
          )}

          {exercise.targetMuscles.length > 0 && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
              {exercise.targetMuscles.slice(0, 5).join(", ")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {exercise.equipments.slice(0, 2).map((eq) => (
            <span key={eq} className="badge badge-gray text-[10px] sm:text-[11px]">
              {EQUIPMENT_PT[eq] ?? eq}
            </span>
          ))}
          {diffBadge && exercise.difficulty && (
            <span className={`${diffBadge} text-[10px] sm:text-[11px]`}>
              {DIFF_LABEL[exercise.difficulty] ?? exercise.difficulty}
            </span>
          )}
        </div>

        {onAddToWorkout && (
          <button
            onClick={(e) => { e.preventDefault(); onAddToWorkout(exercise); }}
            className="btn btn-primary btn-sm text-xs w-full sm:w-auto"
          >
            + Adicionar
          </button>
        )}
      </div>
    </div>
  );
}

