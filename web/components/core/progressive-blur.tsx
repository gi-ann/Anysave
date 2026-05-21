"use client";

import React from "react";

export function ProgressiveBlur({
  direction = "bottom",
  className = "",
}: {
  direction?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      style={{
        maskImage: `linear-gradient(to ${direction}, black 0%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to ${direction}, black 0%, transparent 100%)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    />
  );
}
