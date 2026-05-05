import { Suspense } from "react";
import WorkoutDetail from "./WorkoutDetail";

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--color-text-muted)]">Carregando...</div>}>
      <WorkoutDetail />
    </Suspense>
  );
}
