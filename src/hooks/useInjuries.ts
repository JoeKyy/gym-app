"use client";
import { useState, useEffect, useCallback } from "react";
import { getInjuries, saveInjuries } from "@/lib/storage";
import { isExerciseRisky } from "@/lib/data";
import type { InjuredMuscle, InjurySeverity, Exercise } from "@/lib/types";

export function useInjuries() {
  const [injuries, setInjuries] = useState<InjuredMuscle[]>([]);

  useEffect(() => {
    setInjuries(getInjuries());
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
    (exercise: Exercise) => isExerciseRisky(exercise, injuredMuscleNames),
    [injuredMuscleNames]
  );

  return { injuries, injuredMuscleNames, addInjury, removeInjury, updateSeverity, isRisky };
}
