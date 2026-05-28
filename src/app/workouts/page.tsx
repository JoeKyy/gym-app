"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, LayoutList, Home, Dumbbell, Activity, ChevronLeft } from "lucide-react";
import { useWorkouts } from "@/hooks/useWorkouts";
import type { WorkoutEnvironment } from "@/lib/types";

const ENV_OPTIONS: { value: WorkoutEnvironment; label: string; icon: React.ReactNode }[] = [
  { value: "home",    label: "Casa",      icon: <Home size={14} /> },
  { value: "gym",     label: "Academia",  icon: <Dumbbell size={14} /> },
  { value: "pilates", label: "Pilates",   icon: <Activity size={14} /> },
  { value: "any",     label: "Qualquer",  icon: <Zap size={14} /> },
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
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm inline-flex items-center gap-0.5 mb-1 transition-colors hover:text-[var(--color-text)]"
            style={{ color: "var(--color-text-muted)" }}>
            <ChevronLeft size={16} strokeWidth={2.5} /> Voltar
          </button>
          <h1 className="text-2xl font-bold">Meus Treinos</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/generate" className="btn btn-primary flex items-center gap-1.5">
            <Zap size={14} />Gerar treino
          </Link>
          <Link href="/workouts/templates" className="btn btn-secondary flex items-center gap-1.5">
            <LayoutList size={14} />Templates
          </Link>
          <button onClick={() => setShowForm((v) => !v)} className="btn btn-secondary">
            + Manual
          </button>
        </div>
      </div>

      {/* Generator promo card (shown when no workouts) */}
      {workouts.length === 0 && (
        <Link href="/generate" className="card card-interactive p-5 flex items-center gap-4 border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: "var(--color-primary-soft-strong)" }}>
            <Zap size={24} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="font-bold text-base text-[var(--color-primary)]">Gerador de Treino</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Monte um treino personalizado em segundos — escolha o foco, equipamento e objetivo
            </p>
          </div>
          <span className="text-[var(--color-primary)] text-xl ml-auto shrink-0">→</span>
        </Link>
      )}

      {showForm && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold">Criar treino manualmente</h2>
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

      {workouts.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => {
              const envOpt = ENV_OPTIONS.find((e) => e.value === workout.environment);
              return (
                <div key={workout.id} className="card card-interactive p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{workout.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                <div className="flex items-center gap-0.5">
                  {envOpt?.icon}
                  <span className="ml-1">{envOpt?.label}</span> • {workout.exercises.length} exercícios
                </div>
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

          {/* Quick link to generator at bottom */}
          <Link href="/generate" className="card card-interactive p-4 flex items-center gap-3">
            <Zap size={20} style={{ color: "var(--color-primary)" }} />
            <span className="text-sm font-medium">Gerar novo treino automaticamente</span>
            <span className="ml-auto text-[var(--color-text-muted)]">→</span>
          </Link>
        </>
      )}
    </div>
  );
}
