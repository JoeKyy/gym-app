"use client";
import Link from "next/link";
import type { Exercise } from "@/lib/types";
import { EQUIPMENT_PT } from "@/lib/translations";
import ExerciseMedia from "@/components/ExerciseMedia";

interface Props {
  exercise: Exercise;
  isRisky?: boolean;
  onAddToWorkout?: (exercise: Exercise) => void;
  variant?: "grid" | "list";
}

const DIFF_LABEL: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  expert: "Avançado",
  advanced: "Avançado",
};

export default function ExerciseCard({ exercise, isRisky, onAddToWorkout, variant = "grid" }: Props) {
  const diffBadge =
    exercise.difficulty === "beginner" ? "badge badge-green" :
    exercise.difficulty === "intermediate" ? "badge badge-amber" :
    exercise.difficulty ? "badge badge-red" : null;

  if (variant === "list") {
    return (
      <div className={`card card-interactive overflow-hidden flex flex-row items-center gap-0 ${
        isRisky ? "border-[var(--color-danger-border)]" : ""
      }`}>
        {/* Thumbnail */}
        <Link href={`/exercises/${exercise.slug}`} className="shrink-0 block">
          <ExerciseMedia
            exercise={exercise}
            risky={isRisky}
            className="w-16 h-16 sm:w-20 sm:h-20"
          />
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 px-3 py-2.5">
          <Link
            href={`/exercises/${exercise.slug}`}
            className="font-semibold text-sm leading-snug line-clamp-1 hover:text-[var(--color-primary)] transition-colors"
            style={{ color: "var(--color-text)" }}
          >
            {exercise.name}
          </Link>

          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--color-text-muted)" }}>
            {exercise.targetMuscles.slice(0, 3).join(", ")}
          </p>

          {exercise.equipments.length > 0 && (
            <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: "var(--color-text-muted)" }}>
              {exercise.equipments.slice(0, 2).map((eq) => EQUIPMENT_PT[eq] ?? eq).join(" · ")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 pr-3 flex flex-col items-center gap-1.5">
          {diffBadge && exercise.difficulty && (
            <span className={`${diffBadge} text-[10px]`}>
              {DIFF_LABEL[exercise.difficulty] ?? exercise.difficulty}
            </span>
          )}
          {onAddToWorkout && (
            <button
              onClick={(e) => { e.preventDefault(); onAddToWorkout(exercise); }}
              className="btn btn-primary btn-sm text-xs px-2.5 py-1"
            >
              +
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card card-interactive overflow-hidden flex flex-col
                  ${isRisky ? "border-[var(--color-danger-border)]" : ""}`}
    >
      {/* Media — always full-width on top */}
      <Link href={`/exercises/${exercise.slug}`} className="block w-full shrink-0">
        <ExerciseMedia
          exercise={exercise}
          risky={isRisky}
          className="w-full h-[180px]"
        />
      </Link>

      {/* Info */}
      <div className="flex flex-col justify-between p-3 flex-1 min-w-0 gap-2">
        <div className="min-w-0">
          <Link
            href={`/exercises/${exercise.slug}`}
            className="font-bold text-sm leading-snug line-clamp-2
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
              {exercise.targetMuscles.slice(0, 4).join(", ")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {exercise.equipments.slice(0, 2).map((eq) => (
            <span key={eq} className="badge badge-gray text-[10px]">
              {EQUIPMENT_PT[eq] ?? eq}
            </span>
          ))}
          {diffBadge && exercise.difficulty && (
            <span className={`${diffBadge} text-[10px]`}>
              {DIFF_LABEL[exercise.difficulty] ?? exercise.difficulty}
            </span>
          )}
        </div>

        {onAddToWorkout && (
          <button
            onClick={(e) => { e.preventDefault(); onAddToWorkout(exercise); }}
            className="btn btn-primary btn-sm text-xs w-full"
          >
            + Adicionar
          </button>
        )}
      </div>
    </div>
  );
}

