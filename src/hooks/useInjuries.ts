"use client";
import { useState, useEffect, useCallback } from "react";
import { getInjuries, getInjuriesV2, saveInjuries } from "@/lib/storage";
import { isExerciseRisky } from "@/lib/data";
import { INJURY_CONDITIONS_MAP } from "@/lib/rehab";
import type { InjuredMuscle, InjurySeverity, Exercise, Injury } from "@/lib/types";

const LOAD_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

function isSpinalLoadRisky(exercise: Exercise, activeInjuries: Injury[]): boolean {
  if (!exercise.spinalLoad) return false;
  const exRank = LOAD_RANK[exercise.spinalLoad] ?? 0;
  return activeInjuries.some((inj) => {
    if (inj.phase === "recovered") return false;
    const condition = INJURY_CONDITIONS_MAP.get(inj.conditionId);
    if (!condition?.spinalLoadLimit) return false;
    const limit = condition.spinalLoadLimit[inj.phase];
    if (!limit) return false;
    return exRank > (LOAD_RANK[limit] ?? 2);
  });
}

export function useInjuries() {
  const [injuries, setInjuries] = useState<InjuredMuscle[]>([]);
  const [injuriesV2, setInjuriesV2] = useState<Injury[]>([]);

  useEffect(() => {
    setInjuries(getInjuries());
    setInjuriesV2(getInjuriesV2());
  }, []);

  const addInjury = useCallback((muscle: string, severity: InjurySeverity = "recovering") => {
    setInjuries((prev) => {
      const exists = prev.find((i) => i.muscle === muscle);
      if (exists) return prev;
      const updated = [...prev, { muscle, severity }];
      saveInjuries(updated);
      return updated;
    });
  }, []);

  const removeInjury = useCallback((muscle: string) => {
    setInjuries((prev) => {
      const updated = prev.filter((i) => i.muscle !== muscle);
      saveInjuries(updated);
      return updated;
    });
  }, []);

  const updateSeverity = useCallback((muscle: string, severity: InjurySeverity) => {
    setInjuries((prev) => {
      const updated = prev.map((i) => (i.muscle === muscle ? { ...i, severity } : i));
      saveInjuries(updated);
      return updated;
    });
  }, []);

  const injuredMuscleNames = injuries.map((i) => i.muscle);

  const isRisky = useCallback(
    (exercise: Exercise) =>
      isExerciseRisky(exercise, injuredMuscleNames) ||
      isSpinalLoadRisky(exercise, injuriesV2),
    [injuredMuscleNames, injuriesV2]
  );

  return { injuries, injuriesV2, injuredMuscleNames, addInjury, removeInjury, updateSeverity, isRisky };
}
