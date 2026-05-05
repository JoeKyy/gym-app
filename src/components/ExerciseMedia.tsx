"use client";

/**
 * ExerciseMedia — always-on animated video with IntersectionObserver.
 *
 * Videos are local MP4s. We use IntersectionObserver so only cards in the
 * viewport play; cards outside are paused/unloaded, keeping CPU+memory sane
 * even with 100+ cards rendered.
 *
 * Falls back to static JPEG poster if video fails or is unavailable.
 */

import { useRef, useEffect, useState } from "react";
import type { Exercise } from "@/lib/types";

export type VideoAngle = "frontMale" | "sideMale" | "frontFemale" | "sideFemale";

const ANGLE_PRIORITY: VideoAngle[] = ["frontMale", "frontFemale", "sideMale", "sideFemale"];

export function getVideoUrl(exercise: Exercise, angle?: VideoAngle): string | null {
  if (!exercise.videoUrls || typeof exercise.videoUrls !== "object") return null;
  const v = exercise.videoUrls as Record<string, string | null>;
  if (angle && v[angle]) return v[angle]!;
  for (const a of ANGLE_PRIORITY) {
    if (v[a]) return v[a]!;
  }
  return null;
}

export function getAvailableAngles(exercise: Exercise): VideoAngle[] {
  if (!exercise.videoUrls || typeof exercise.videoUrls !== "object") return [];
  const v = exercise.videoUrls as Record<string, string | null>;
  return ANGLE_PRIORITY.filter((a) => !!v[a]);
}

interface ExerciseMediaProps {
  exercise: Exercise;
  angle?: VideoAngle;
  /** CSS class for the container div */
  className?: string;
  /** Extra style for the container div */
  style?: React.CSSProperties;
  /** Show a risky/warning badge */
  risky?: boolean;
  /** Called when clicked */
  onClick?: () => void;
}

export default function ExerciseMedia({
  exercise,
  angle,
  className = "",
  style,
  risky,
  onClick,
}: ExerciseMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoError, setVideoError] = useState(false);

  const videoUrl = !videoError ? getVideoUrl(exercise, angle) : null;
  const posterUrl = exercise.gifUrl ?? undefined;

  // Autoplay when in viewport, pause when out
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {/* Autoplay blocked — silent fail */});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [videoUrl]);

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      ref={containerRef as React.Ref<HTMLDivElement & HTMLButtonElement>}
      className={`relative overflow-hidden bg-[var(--color-surface-2)] ${className}`}
      style={style}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      {/* Risky badge */}
      {risky && (
        <span className="absolute top-1.5 left-1.5 z-10 badge badge-red text-[9px] px-1.5 py-0.5 pointer-events-none">
          ⚠ Risco
        </span>
      )}

      {videoUrl ? (
        <video
          ref={videoRef}
          key={videoUrl}
          src={videoUrl}
          poster={posterUrl}
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover"
          // preload="none" keeps initial page load fast; IO starts playback when visible
          preload="none"
        />
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt={exercise.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
          🏋
        </div>
      )}
    </Tag>
  );
}
