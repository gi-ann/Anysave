"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function AuthScreen() {
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);

  // --- MENCEGAH BUG STUCK SAAT KLIK BACK BROWSER ---
  useEffect(() => {
    // Sensor ketika halaman kembali aktif setelah user klik tombol Back
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setOauthLoading(null);
      }
    };
    const handleFocus = () => setOauthLoading(null);

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // --- Hanya Logika Login Google ---
  const handleOAuth = async (provider: "google") => {
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          queryParams: {
            prompt: "select_account", // <-- MEMAKSA MUNCULKAN PILIHAN AKUN GOOGLE
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(`Gagal terhubung ke ${provider}.`, err);
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 overflow-hidden select-none">
      
      {/* 1. Background Video Sinematik */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 transition-opacity duration-1000"
        src="/meadow.mp4"
      />

      {/* Efek gelap tipis di pinggir layar agar teks di tengah makin fokus */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />

      {/* 2. Tombol Teks Raksasa di Tengah */}
      <div className="relative z-10 flex items-center justify-center">
        <motion.button
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          // Animasi berubah otomatis ketika tombol diklik (state oauthLoading berubah)
          animate={{ 
            opacity: oauthLoading === "google" ? 0.6 : 1, 
            scale: oauthLoading === "google" ? 0.98 : 1, 
            filter: oauthLoading === "google" ? "blur(8px)" : "blur(0px)" 
          }}
          transition={{ duration: oauthLoading === "google" ? 0.4 : 1.5, ease: "easeOut", delay: oauthLoading === "google" ? 0 : 0.5 }}
          onClick={() => handleOAuth("google")}
          disabled={oauthLoading !== null}
          // Default putih normal, saat hover akan mengaktifkan efek difference dan membesar (jika tidak sedang loading)
          className={`text-white outline-none cursor-pointer transition-all duration-300 ease-in-out hover:mix-blend-difference ${oauthLoading === null ? "hover:scale-105" : ""}`}
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "80px", 
            fontWeight: 400,
            lineHeight: "1",
            letterSpacing: "-0.02em"
          }}
        >
          Login With Google
        </motion.button>
      </div>

    </div>
  );
}