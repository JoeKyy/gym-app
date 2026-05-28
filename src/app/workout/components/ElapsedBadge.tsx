"use client";

import { useState, useEffect } from "react";

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ElapsedBadge({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - Date.parse(startedAt)) / 1000)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <span>{formatElapsed(elapsed)}</span>;
}
