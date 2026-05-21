"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, ArrowLeft, Check,
  CircleMinus, CirclePlus, Ellipsis
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useSidebar, SidebarTrigger } from "@/features/sidebar/SidebarCore";
import { GlassSurface, Magnetic, AnimatedEllipsis } from "@/components/ui-assets";
import { AnimateIcon } from "@/components/ui";
import { Search } from "@/components/animate-ui/icons/search";

export function TopLeftControls() {
  const {
    colCount, setColCount, globalSearchQuery, setGlobalSearchQuery, isSearchingSemantic,
  } = useAppContext();
  const { state, isMobile } = useSidebar();
  const [openMode, setOpenMode] = useState<"idle" | "search" | "settings">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  const isExpanded = state === "expanded" && !isMobile;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (openMode !== "idle") setOpenMode("idle");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMode]);

  return (
    <>
      <motion.div
        ref={containerRef}
        initial={false}
        animate={{ x: isExpanded ? 512 : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-6 left-8 z-40 flex items-start gap-4"
      >
        <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }}>
          <SidebarTrigger />
        </Magnetic>

        <AnimatePresence mode="popLayout">
          {openMode === "idle" && (
            <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }} key="toolbar-idle">
              <motion.div layoutId="toolbar-morph" className="relative flex outline-none">
                <GlassSurface width={104} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
                  <div className="flex relative z-10 w-full px-3 justify-between items-center h-full text-zinc-400">
                    <motion.button 
                      initial="rest"
                      whileHover="hover"
                      onClick={() => setOpenMode("settings")} 
                      className="relative flex h-full w-10 shrink-0 items-center justify-center outline-none focus:outline-none focus:ring-0 cursor-pointer transition-colors hover:text-white group"
                    >
                      <AnimatedEllipsis size={22} strokeWidth={2.5} />
                    </motion.button>
                    <button onClick={() => setOpenMode("search")} className="relative flex h-full w-10 shrink-0 items-center justify-center outline-none focus:outline-none focus:ring-0 cursor-pointer transition-colors hover:text-white group">
                      <Search animateOnHover size={22} className="transition-transform group-hover:scale-110" />
                    </button>
                  </div>
                </GlassSurface>
              </motion.div>
            </Magnetic>
          )}

          {openMode === "search" && (
            <motion.div layoutId="toolbar-morph" key="toolbar-search" className="relative flex outline-none">
              <GlassSurface width={260} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
                <div className="flex relative z-10 w-full px-2 items-center h-full text-zinc-400">
                  <button onClick={() => { setOpenMode("idle"); setGlobalSearchQuery(""); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:text-white transition-colors group outline-none focus:outline-none focus:ring-0">
                    <ArrowLeft size={22} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
                  </button>
                  <input autoFocus placeholder="Search your mind..." value={globalSearchQuery} onChange={(e) => setGlobalSearchQuery(e.target.value)} className="h-10 w-full bg-transparent px-2 text-sm text-white placeholder-zinc-400 outline-none focus:outline-none focus:ring-0" />
                  {isSearchingSemantic && (
                    <div className="absolute right-3 flex items-center justify-center pointer-events-none">
                      <Loader2 size={16} className="animate-spin text-zinc-500" />
                    </div>
                  )}
                </div>
              </GlassSurface>
            </motion.div>
          )}

          {openMode === "settings" && (
            <motion.div layoutId="toolbar-morph" key="toolbar-settings" className="relative flex outline-none">
              <GlassSurface width={140} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
                <div className="flex relative z-10 w-full px-2 items-center justify-between h-full text-zinc-400">
                  <motion.button 
                    initial="rest"
                    whileHover="hover"
                    onClick={() => setOpenMode("idle")} 
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:text-white transition-colors group outline-none focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    <motion.div animate={{ rotate: 90 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                      <AnimatedEllipsis size={22} strokeWidth={2.5} />
                    </motion.div>
                  </motion.button>

                  <div className="flex items-center gap-1 pr-1">
                    <button onClick={() => setColCount(Math.min(8, colCount + 1))} className="flex h-8 w-8 items-center justify-center rounded-full hover:text-white transition-colors group outline-none focus:outline-none focus:ring-0" title="Perkecil (Lebih banyak kolom)">
                      <AnimateIcon action="scale" animateOnHover><CircleMinus size={22} strokeWidth={2.5} /></AnimateIcon>
                    </button>
                    <button onClick={() => setColCount(Math.max(2, colCount - 1))} className="flex h-8 w-8 items-center justify-center rounded-full hover:text-white transition-colors group outline-none focus:outline-none focus:ring-0" title="Perbesar (Lebih sedikit kolom)">
                      <AnimateIcon action="scale" animateOnHover><CirclePlus size={22} strokeWidth={2.5} /></AnimateIcon>
                    </button>
                  </div>
                </div>
              </GlassSurface>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function FloatingAddButton({ onSave }: { onSave: (url: string) => Promise<void>; }) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleAutoPaste = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saveStatus !== "idle") return;

    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === "") {
        setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 1500); return;
      }
      setSaveStatus("loading");
      await onSave(text.trim());
      setSaveStatus("success"); setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (err) {
      setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 1500);
    }
  };

  return (
    <div className="relative">
      <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }} key="trigger-button">
        <motion.div layoutId="morphing-add-container" onClick={handleAutoPaste} className="relative flex outline-none cursor-pointer group" title="Auto-Paste & Save from Clipboard">
          <GlassSurface width={48} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
            <Magnetic intensity={0.1} actionArea="global" range={200} springOptions={{ bounce: 0.1 }}>
              <div className="flex items-center justify-center relative z-10 w-full h-full pointer-events-none text-zinc-300 hover:text-white transition-colors">
                <AnimatePresence mode="wait">
                  {saveStatus === "idle" && (
                    <motion.div key="idle" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                      <Plus size={22} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
                    </motion.div>
                  )}
                  {saveStatus === "loading" && (
                    <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                      <Loader2 size={22} strokeWidth={2.5} className="animate-spin text-white" />
                    </motion.div>
                  )}
                  {saveStatus === "success" && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                      <Check size={22} strokeWidth={2.5} className="text-green-400" />
                    </motion.div>
                  )}
                  {saveStatus === "error" && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                      <span className="text-red-400 font-bold text-lg leading-none">!</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Magnetic>
          </GlassSurface>
        </motion.div>
      </Magnetic>
    </div>
  );
}

export function TopRightControls({ onSave }: { onSave: (url: string, folder: string) => Promise<void>; }) {
  const { currentView, currentFolderId, folders } = useAppContext();
  const currentFolder = currentView === "folder" && currentFolderId !== null ? folders.find((f) => f.id === currentFolderId) : null;
  const targetFolder = currentFolder ? currentFolder.fullPath || currentFolder.name : "";

  return (
    <div className="fixed top-6 right-8 z-40 flex items-start gap-4">
      {/* Hanya menyisakan tombol tambah (Plus) di pojok kanan atas */}
      <FloatingAddButton onSave={(url) => onSave(url, targetFolder)} />
    </div>
  );
}