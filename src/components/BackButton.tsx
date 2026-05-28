"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
}

/** Navigates back using router.back(). Falls back to router.replace(fallbackHref) when there is no browser history (e.g. page opened directly). */
export default function BackButton({ fallbackHref = "/", label, className = "" }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    // If there is no history to go back to, fall back to the specified href
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  }

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-0.5 text-sm transition-colors hover:text-[var(--color-text)] ${className}`}
      style={{ color: "var(--color-text-muted)" }}
    >
      <ChevronLeft size={16} strokeWidth={2.5} />
      {label ?? "Voltar"}
    </button>
  );
}
