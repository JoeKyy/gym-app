"use client";

import { useState, useCallback } from "react";
import type { SessionLogs, ExerciseSessionState } from "../types";
import type { Workout } from "@/lib/types";

function initSessionLogs(workout: Workout): SessionLogs {
  const logs: SessionLogs = {};
  for (const { exerciseId, config } of workout.exercises) {
    logs[exerciseId] = {
      sets: Array.from({ length: config.sets }, () => ({
        reps: String(config.reps),
        weight: "",
        completed: false,
      })),
    };
  }
  return logs;
}

export function useSessionLogs() {
  const [sessionLogs, setSessionLogs] = useState<SessionLogs>({});

  const initLogs = useCallback((workout: Workout) => {
    setSessionLogs(initSessionLogs(workout));
  }, []);

  const updateSetLog = useCallback((exerciseId: string, newState: ExerciseSessionState) => {
    setSessionLogs((prev) => ({ ...prev, [exerciseId]: newState }));
  }, []);

  const clearLogs = useCallback(() => {
    setSessionLogs({});
  }, []);

  return { sessionLogs, setSessionLogs, initLogs, updateSetLog, clearLogs };
}
