"use client";
import { useState, useEffect, useCallback } from "react";
import { getWorkouts, saveWorkout, deleteWorkout, generateId, now } from "@/lib/storage";
import type { Workout, WorkoutExercise, WorkoutEnvironment } from "@/lib/types";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setWorkouts(getWorkouts());
    setHydrated(true);
  }, []);

  const createWorkout = useCallback(
    (name: string, environment: WorkoutEnvironment = "any"): Workout => {
      const workout: Workout = {
        id: generateId(),
        name,
        environment,
        exercises: [],
        createdAt: now(),
        updatedAt: now(),
      };
      saveWorkout(workout);
      setWorkouts(getWorkouts());
      return workout;
    },
    []
  );

  const updateWorkout = useCallback((workout: Workout) => {
    const updated = { ...workout, updatedAt: now() };
    saveWorkout(updated);
    setWorkouts(getWorkouts());
    return updated;
  }, []);

  const removeWorkout = useCallback((id: string) => {
    deleteWorkout(id);
    setWorkouts(getWorkouts());
  }, []);

  return { workouts, hydrated, createWorkout, updateWorkout, removeWorkout };
}
