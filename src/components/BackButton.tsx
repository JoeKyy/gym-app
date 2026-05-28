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
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  }

  return (
    <button
      onClick={handleBack}
      aria-label={label ?? "Voltar"}
      title={label ?? "Voltar"}
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-[var(--color-surface-2)] active:scale-95 ${className}`}
      style={{ color: "var(--color-text-muted)" }}
    >
      <ChevronLeft size={20} strokeWidth={2} />
    </button>
  );
}
