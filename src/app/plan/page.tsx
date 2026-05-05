import { Suspense } from "react";
import PlanDetail from "./PlanDetail";

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--color-text-muted)]">Carregando...</div>}>
      <PlanDetail />
    </Suspense>
  );
}
