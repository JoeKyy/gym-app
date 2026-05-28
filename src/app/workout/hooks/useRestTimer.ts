"use client";

import { useState, useRef, useCallback } from "react";

export interface RestTimerState {
  remaining: number;
  total: number;
}

export function useRestTimer() {
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRestTimer = useCallback((seconds: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer({ remaining: seconds, total: seconds });
    const id = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || prev.remaining <= 1) {
          clearInterval(id);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    restTimerRef.current = id;
  }, []);

  const skipRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestTimer(null);
  }, []);

  const clearOnUnmount = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
  }, []);

  return { restTimer, startRestTimer, skipRestTimer, clearOnUnmount };
}
