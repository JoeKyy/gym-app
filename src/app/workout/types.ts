export interface SetState {
  reps: string;
  weight: string;
  completed: boolean;
}

export interface ExerciseSessionState {
  sets: SetState[];
}

export type SessionLogs = Record<string, ExerciseSessionState>;

export interface SheetSetRow {
  id: number;
  weight: string;
  reps: string;
  done: boolean;
}

export function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
