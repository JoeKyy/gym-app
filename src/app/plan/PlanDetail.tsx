"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Home, Dumbbell, Activity, Zap, Check, ChevronLeft } from "lucide-react";
import { usePlans, DAY_ORDER, DAY_LABELS } from "@/hooks/usePlans";
import { useWorkouts } from "@/hooks/useWorkouts";
import type { WeeklyPlan, DayOfWeek } from "@/lib/types";

export default function PlanEditorPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { plans, activePlanId, updatePlan, activatePlan } = usePlans();
  const { workouts } = useWorkouts();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);

  useEffect(() => {
    const found = plans.find((p) => p.id === id);
    if (found) setPlan(found);
  }, [plans, id]);

  if (!plan) return <div className="text-center py-20 text-[var(--color-text-muted)]">Plano não encontrado</div>;

  const isActive = plan.id === activePlanId;

  const toggleWorkout = (day: DayOfWeek, workoutId: string) => {
    const current = plan.schedule[day] ?? [];
    const updated: WeeklyPlan = {
      ...plan,
      schedule: {
        ...plan.schedule,
        [day]: current.includes(workoutId)
          ? current.filter((id) => id !== workoutId)
          : [...current, workoutId],
      },
    };
    setPlan(updated);
    updatePlan(updated);
  };

  const workoutMap = new Map(workouts.map((w) => [w.id, w]));
  const ENV_ICON: Record<string, React.ReactNode> = {
    home: <Home size={12} />,
    gym: <Dumbbell size={12} />,
    pilates: <Activity size={12} />,
    any: <Zap size={12} />,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => history.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{plan.name}</h1>
            {isActive && <span className="text-xs text-[var(--color-primary)]">✓ Plano ativo</span>}
          </div>
        </div>
        {!isActive && (
          <button
            onClick={() => activatePlan(plan.id)}
            className="btn btn-primary btn-sm"
          >
            Ativar plano
          </button>
        )}
      </div>

      {workouts.length === 0 && (
        <div className="rounded-xl p-4 text-sm bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-[var(--color-primary)]">
          Você ainda não tem treinos criados.{" "}
          <Link href="/workouts" className="underline hover:text-[var(--color-text)]">Criar treino →</Link>
        </div>
      )}

      <div className="space-y-3">
        {DAY_ORDER.map((day) => {
          const dayWorkoutIds = plan.schedule[day] ?? [];
          return (
            <div key={day} className="card p-4">
              <h3 className="font-semibold text-sm mb-3">{DAY_LABELS[day]}</h3>

              {dayWorkoutIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {dayWorkoutIds.map((wid) => {
                    const w = workoutMap.get(wid);
                    if (!w) return null;
                    return (
                      <div
                        key={wid}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-[var(--color-primary)]"
                      >
                        <span className="flex items-center">{ENV_ICON[w.environment] ?? <Zap size={12} />}</span>
                        <Link href={`/workout?id=${w.id}`} className="hover:text-[var(--color-text)]">{w.name}</Link>
                        <button onClick={() => toggleWorkout(day, wid)} className="text-[var(--color-primary)] hover:text-[var(--color-danger)] ml-0.5">×</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <details>
                <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)] select-none">
                  {dayWorkoutIds.length === 0 ? "Atribuir treino..." : "+ Adicionar mais"}
                </summary>
                <div className="flex flex-wrap gap-2 mt-2 pl-1">
                  {workouts.map((w) => {
                    const assigned = dayWorkoutIds.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        onClick={() => toggleWorkout(day, w.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          assigned
                            ? "bg-[var(--color-primary-soft)] border-[var(--color-primary-border)] text-[var(--color-primary)]"
                            : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                        }`}
                      >
                        {assigned ? <Check size={10} className="shrink-0" /> : null}{ENV_ICON[w.environment] ?? <Zap size={12} />} {w.name}
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
