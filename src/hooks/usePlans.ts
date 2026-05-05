"use client";
import { useState, useEffect, useCallback } from "react";
import { getPlans, savePlan, deletePlan, getActivePlanId, setActivePlanId, generateId, now } from "@/lib/storage";
import type { WeeklyPlan, DayOfWeek } from "@/lib/types";

const DAY_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export { DAY_ORDER };

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

export function usePlans() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);

  useEffect(() => {
    setPlans(getPlans());
    setActivePlanIdState(getActivePlanId());
  }, []);

  const createPlan = useCallback((name: string): WeeklyPlan => {
    const plan: WeeklyPlan = {
      id: generateId(),
      name,
      schedule: {},
      active: false,
      createdAt: now(),
      updatedAt: now(),
    };
    savePlan(plan);
    setPlans(getPlans());
    return plan;
  }, []);

  const updatePlan = useCallback((plan: WeeklyPlan) => {
    const updated = { ...plan, updatedAt: now() };
    savePlan(updated);
    setPlans(getPlans());
  }, []);

  const removePlan = useCallback((id: string) => {
    deletePlan(id);
    setPlans(getPlans());
  }, []);

  const activatePlan = useCallback((id: string) => {
    setActivePlanId(id);
    setActivePlanIdState(id);
  }, []);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  const todayWorkoutIds = useCallback((): string[] => {
    if (!activePlan) return [];
    const days: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const today = days[new Date().getDay()];
    return activePlan.schedule[today] ?? [];
  }, [activePlan]);

  return { plans, activePlan, activePlanId, createPlan, updatePlan, removePlan, activatePlan, todayWorkoutIds };
}
