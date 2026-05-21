"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function Tilt({
  children,
  rotationFactor = 15,
  isRevese = false,
  className,
}: {
  children: React.ReactNode;
  rotationFactor?: number;
  isRevese?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Posisi X dan Y mouse (-0.5 sampai 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Pengaturan kelenturan (Spring) agar animasinya buttery smooth
  const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };

  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    isRevese
      ? [rotationFactor, -rotationFactor]
      : [-rotationFactor, rotationFactor],
  );
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    isRevese
      ? [-rotationFactor, rotationFactor]
      : [rotationFactor, -rotationFactor],
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Menghitung posisi mouse di dalam kartu (-0.5 sampai 0.5)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    // Kembalikan semua ke posisi datar dan netral saat mouse pergi
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      // Tambahkan cursor-pointer agar mouse otomatis berubah menjadi tangan
      className={`cursor-pointer ${className || ""}`}
    >
      {children}
    </motion.div>
  );
}
