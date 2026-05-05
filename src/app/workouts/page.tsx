"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkouts } from "@/hooks/useWorkouts";
import type { WorkoutEnvironment } from "@/lib/types";

const ENV_OPTIONS: { value: WorkoutEnvironment; label: string; icon: string }[] = [
  { value: "home", label: "Casa", icon: "🏠" },
  { value: "gym", label: "Academia", icon: "🏋" },
  { value: "pilates", label: "Pilates", icon: "🧘" },
  { value: "any", label: "Qualquer", icon: "⚡" },
];

export default function WorkoutsPage() {
  const { workouts, createWorkout, removeWorkout } = useWorkouts();
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState<WorkoutEnvironment>("any");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const workout = createWorkout(newName.trim(), newEnv);
    setNewName("");
    setShowForm(false);
    router.push(`/workout?id=${workout.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Treinos</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn btn-primary"
        >
          + Novo treino
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold">Criar treino</h2>
          <input
            autoFocus
            type="text"
            placeholder="Nome do treino..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="input"
          />
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Ambiente</p>
            <div className="flex gap-2 flex-wrap">
              {ENV_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setNewEnv(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    newEnv === value
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn btn-primary">Criar</button>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium text-[var(--color-text)]">Nenhum treino ainda</p>
          <p className="text-sm mt-1">Crie seu primeiro treino clicando em "+ Novo treino"</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => {
            const envOpt = ENV_OPTIONS.find((e) => e.value === workout.environment);
            return (
              <div key={workout.id} className="card card-interactive p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{workout.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {envOpt?.icon} {envOpt?.label} • {workout.exercises.length} exercícios
                    </p>
                  </div>
                  <button
                    onClick={() => removeWorkout(workout.id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-lg leading-none"
                    title="Excluir"
                  >
                    ×
                  </button>
                </div>
                <Link
                  href={`/workout?id=${workout.id}`}
                  className="rounded-lg text-center py-2 text-sm transition-colors bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft-strong)] text-[var(--color-primary)] border border-[var(--color-primary-border)]"
                >
                  Abrir treino →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
