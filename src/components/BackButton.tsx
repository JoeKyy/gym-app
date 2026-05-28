"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
}

/** Navigates back using router.back(). Falls back to href if no history. */
export default function BackButton({ fallbackHref = "/", label, className = "" }: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className={`flex items-center gap-0.5 text-sm transition-colors hover:text-[var(--color-text)] ${className}`}
      style={{ color: "var(--color-text-muted)" }}
    >
      <ChevronLeft size={16} strokeWidth={2.5} />
      {label ?? "Voltar"}
    </button>
  );
}
