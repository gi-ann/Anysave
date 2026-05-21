"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring as useFramerSpring, useTransform } from "framer-motion";
import { GlowEffect, Aurora, AnimatedSquareArrowOutUpRight } from "@/components/ui-assets";
import { Trash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export function BookmarkCard({
  item, onClick, onContextMenu, isSelected, viewMode = "moodboard",
  cardSettings = { cover: true, title: true, description: false, tags: false, info: true }
}: any) {
  const [isHover, setIsHover] = useState(false);
  const { setBookmarks } = useAppContext();
  
  const isHorizontal = viewMode === "list" || viewMode === "timeline";
  const isTimeline = viewMode === "timeline";
  const isCard = viewMode === "card";
  const { cover, title, description, tags, info } = cardSettings;
  const showTextOutside = isHorizontal || !cover || isCard;

  const isLogo = item.image && !item.image.includes("thum.io") && !item.image.includes("microlink.io") && (item.image.includes("favicons") || item.image.toLowerCase().includes("logo") || item.image.toLowerCase().includes("icon") || item.image.toLowerCase().includes("badge"));

  // Sistem Deteksi Cerdas: Jika terjadi error jaringan yang menyisakan "Ghost Card"
  const isGhostCard = !item.title || item.title === "Link" || item.title === "X User" || !item.tldr || item.tldr.trim() === "" || item.tldr.includes("[ERROR") || !item.source;

  // Fungsi Optimistic Deletion: Musnahkan langsung dari layar saat itu juga
  const handleDeleteGhost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks((prev: any[]) => prev.filter((b) => b.id !== item.id)); // Hapus dari UI
    try {
      if (item.id) await supabase.from("bookmarks").delete().eq("id", item.id); // Hapus dari DB
    } catch (err) {
      console.error("Gagal menghapus ghost card:", err);
    }
  };

  // =====================================================================
  // INLINE TILT LOGIC
  // =====================================================================
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useFramerSpring(1, { stiffness: 300, damping: 30 });
  const mouseXSpring = useFramerSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useFramerSpring(y, { stiffness: 300, damping: 30 });

  const rotationFactor = isHorizontal ? 2 : 8;
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [-rotationFactor, rotationFactor]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [rotationFactor, -rotationFactor]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
    scale.set(1.02);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
    setIsHover(false);
  };

  return (
    <div 
      suppressHydrationWarning
      className={`w-full break-inside-avoid mb-6 relative ${isTimeline ? "pl-8 border-l-2 border-zinc-800 ml-2 md:ml-0" : ""}`}
      style={{ perspective: "1000px" }}
    >
      {isTimeline && <div className="absolute left-[-9px] top-8 w-4 h-4 rounded-full bg-zinc-950 border-[3px] border-zinc-500" />}
      
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHover(true)}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d"
        }}
        className="relative w-full h-full"
      >
        <motion.div className="pointer-events-none absolute -inset-[2px] z-0 rounded-[12px]" animate={{ opacity: isSelected ? 1 : 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <GlowEffect colors={["#0894FF", "#C959DD", "#FF2E54", "#FF9004"]} blur="medium" duration={4} />
        </motion.div>

        <div style={{ borderRadius: "10px" }} className={`relative z-10 flex w-full overflow-hidden bg-zinc-900 shadow-2xl cursor-pointer ${isSelected ? "" : "hover:shadow-zinc-800/50"} ${isHorizontal ? "flex-row items-stretch h-auto min-h-[120px]" : "flex-col"}`} onClick={onClick} onContextMenu={onContextMenu}>
          {cover && (isLogo ? (
              <div className={`${isHorizontal ? "relative w-48 min-h-[120px] flex-shrink-0" : "relative w-full aspect-square"} flex items-center justify-center overflow-hidden bg-zinc-950`}>
                <Aurora blend={0.8} />
                <img src={item.image} alt={item.title} onError={(e: any) => { try { if (item.image.includes("maxresdefault.jpg")) e.currentTarget.src = item.image.replace("maxresdefault.jpg", "hqdefault.jpg"); else e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${new URL(item.source).hostname.replace("www.", "")}&sz=256`; } catch (err) { e.currentTarget.src = ""; } }} className={`block max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl relative z-10`} />
              </div>
            ) : (
              <div className={`${isHorizontal ? "relative w-48 min-h-[120px] flex-shrink-0" : "w-full"}`}>
                <img src={item.image} alt={item.title} onError={(e: any) => { try { if (item.image.includes("maxresdefault.jpg")) e.currentTarget.src = item.image.replace("maxresdefault.jpg", "hqdefault.jpg"); else e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${new URL(item.source).hostname.replace("www.", "")}&sz=256`; } catch (err) { e.currentTarget.src = ""; } }} className={`block ${isHorizontal ? "absolute inset-0 w-full h-full object-cover" : "w-full h-auto"} ${isCard ? "aspect-[4/3] object-cover" : ""}`} />
              </div>
            ))}

        </div>

        <div className="absolute bottom-4 right-4 z-[100] pointer-events-auto" style={{ transform: "translateZ(50px)" }}>
          <AnimatePresence mode="wait">
            {isHover && (
              isGhostCard ? (
                // IKON TONG SAMPAH EKSKLUSIF UNTUK KARTU RUSAK/GHOST
                <motion.button
                  key="delete-btn"
                  initial="rest" whileHover="hover" whileTap={{ scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-red-500/20 border border-red-500/50 p-0 text-white hover:bg-red-500/40 shadow-lg outline-none group"
                  onClickCapture={handleDeleteGhost}
                  title="Hapus Kartu Rusak"
                >
                  <Trash size={14} className="text-red-400 group-hover:text-red-300 transition-colors" />
                </motion.button>
              ) : (
                // IKON NORMAL "OPEN IN NEW TAB" KEMBALI
                <motion.button
                  key="open-btn"
                  initial="rest" whileHover="hover" whileTap={{ scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-zinc-800/40 backdrop-blur-md p-0 text-zinc-300 hover:bg-zinc-700/50 shadow-lg outline-none group"
                  onClickCapture={(e) => { e.stopPropagation(); window.open(item.source.startsWith("http") ? item.source : `https://${item.source}`, "_blank"); }}
                  title="Buka di Tab Baru"
                >
                  <AnimatedSquareArrowOutUpRight size={14} className="text-zinc-300 group-hover:text-zinc-100 transition-colors" />
                </motion.button>
              )
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {isHover && title && (
          <motion.div 
            className="absolute left-0 right-0 flex flex-col items-start px-1 pointer-events-none"
            style={{ top: "100%", marginTop: 8 }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <p 
              className="truncate w-full text-zinc-400 pointer-events-none" 
              style={{ fontFamily: "'FixelTextCustom', sans-serif", fontSize: "15px", fontWeight: 500, letterSpacing: "0.2px" }}
            >
              {item.title}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BookmarkSkeleton() {
  return (
    <div suppressHydrationWarning className="w-full break-inside-avoid relative mb-6">
      <div className="relative flex w-full flex-col overflow-hidden bg-zinc-900 shadow-2xl rounded-[10px] animate-pulse">
        <div className="w-full h-[300px] bg-zinc-800/40"></div>
        <div className="absolute bottom-0 left-0 w-full pointer-events-none z-30">
          <div className="flex flex-col items-start gap-2 pl-5 pr-14 py-5"><div className="h-4 bg-zinc-700/80 rounded w-2/3"></div><div className="h-3 bg-zinc-800 rounded w-1/2"></div></div>
        </div>
      </div>
    </div>
  );
}