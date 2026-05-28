"use client";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-primary)",
      }}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
