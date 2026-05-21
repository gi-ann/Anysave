"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Plus } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { 
  AnimatedKanban, AnimatedEllipsis, AnimatedSquareArrowOutUpRight, GradualBlur, GlassSurface, Magnetic
} from "@/components/ui-assets";
import { CircularCheckbox, AnimatedGradientText } from "@/components/ui";
import { isInstagramUrl, toTitleCase } from "@/lib/utils/helpers";
import { getVibeScore } from "@/features/ai/vibeScore";
import { FolderType } from "@/types";
import { TextShimmer } from "@/components/core/text-shimmer";
import CustomVideoPlayer from "./CustomVideoPlayer";

const getProxiedVideoUrl = (url: string): string => {
  if (!url) return url;
  
  // FIX SUPER KRUSIAL: Hanya proxy URL jika kita YAKIN 100% itu adalah video
  const isExplicitVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || url.includes("video.twimg.com");
  
  if (isExplicitVideo && (url.includes("twimg.com") || url.includes("cdninstagram.com") || url.includes("fbcdn.net") || url.includes("scontent"))) {
    return `/api/proxy-video?url=${encodeURIComponent(url)}`;
  }
  
  return url;
};

// Tambahkan suppressHydrationWarning pada Table wrapper agar lebih kebal dari ekstensi browser
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (<div suppressHydrationWarning className="relative w-full overflow-auto"><table ref={ref} className={`w-full caption-bottom text-sm border-none ${className || ""}`} {...props} /></div>));
Table.displayName = "Table";
const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (<tbody ref={ref} className={`border-none ${className || ""}`} {...props} />));
TableBody.displayName = "TableBody";
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (<tr ref={ref} className={`transition-colors border-none ${className || ""}`} {...props} />));
TableRow.displayName = "TableRow";
const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (<td ref={ref} className={`p-0 align-middle border-none ${className || ""}`} {...props} />));
TableCell.displayName = "TableCell";

interface BookmarkPreviewProps {
  selectedId: number | string | null;
  setSelectedId: (id: number | string | null) => void;
  contextMenu: any;
  setContextMenu: any;
  similarItems: any[] | null;
  setSimilarItems: (items: any[] | null) => void;
  localMousePos: { x: number, y: number };
  setLocalMousePos: (pos: { x: number, y: number }) => void;
  updateBookmarkField: (id: number | string, field: string, value: string) => Promise<void>;
}

export default function BookmarkPreview({
  selectedId, setSelectedId,
  contextMenu, setContextMenu,
  similarItems, setSimilarItems,
  localMousePos, setLocalMousePos,
  updateBookmarkField
}: BookmarkPreviewProps) {
  const { bookmarks, folders, addFolder } = useAppContext();
  const selectedItemDialog = bookmarks.find((b) => b.id === selectedId);

  const [isModalLeftOpen, setIsModalLeftOpen] = useState(false);
  const [isModalRightOpen, setIsModalRightOpen] = useState(false);
  const [expandedModalFolders, setExpandedModalFolders] = useState<number[]>([]);
  const [selectedDialogFolders, setSelectedDialogFolders] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [instagramVideoUrl, setInstagramVideoUrl] = useState<string | null>(null);
  const [instagramVideoLoading, setInstagramVideoLoading] = useState(false);

  // State untuk form "New Collection" di dalam modal
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineAddUrl, setInlineAddUrl] = useState("");

  // State untuk Auto-Save Notes & UI Indicator
  const [localNote, setLocalNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");
  const noteTimeout = useRef<any>(null);
  
  // State untuk mengecek apakah textarea sedang fokus
  const [isNoteFocused, setIsNoteFocused] = useState(false);

  // Smart Tag: cursor tracking & suggestion
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [noteCursorPos, setNoteCursorPos] = useState(0);

  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    bookmarks.forEach(b => {
      if (b.note) {
        const m = b.note.match(/#[\w\u00C0-\u024F\u4E00-\u9FFF]+/g);
        if (m) m.forEach(t => tags.add(t.toLowerCase()));
      }
    });
    return Array.from(tags);
  }, [bookmarks]);

  const noteActiveSuggestion = React.useMemo(() => {
    const before = localNote.slice(0, noteCursorPos);
    const match = before.match(/(#[\w\u00C0-\u024F\u4E00-\u9FFF]+)$/);
    if (!match) return null;
    const typed = match[1].toLowerCase();
    const found = allTags.find(t => t.startsWith(typed) && t.length > typed.length);
    if (!found) return null;
    return { typed: match[1], remaining: found.slice(typed.length) };
  }, [localNote, noteCursorPos, allTags]);

  const isCalculatingSimilar = useRef(false);
  const scrollUpAccumulator = useRef(0);
  const scrollUpTimeout = useRef<any>(null);

  const galleryList = selectedItemDialog?.gallery && selectedItemDialog.gallery.length > 0
    ? selectedItemDialog.gallery
    : selectedItemDialog ? [selectedItemDialog.image].filter(Boolean) : [];

  const formatLinkDisplay = (url: string) => {
    if (!url) return "Unknown Source";
    try {
      const u = new URL(url);
      const paths = u.pathname.split("/").filter(Boolean);
      const firstPath = paths.length > 0 ? `/${paths[0]}` : "";
      return `${u.hostname.replace("www.", "")}${firstPath}`;
    } catch (e) {
      return url;
    }
  };

  const formatItemDate = (id: string | number | undefined) => {
    const timestamp = typeof id === "number" && id > 1000000000000 ? id : Date.now();
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("id-ID", { month: "long" });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:00`;
  };

  useEffect(() => {
    if (selectedId !== null) {
      document.body.style.overflow = "hidden";
      setIsModalLeftOpen(false); 
      setIsModalRightOpen(false); 
      setCurrentImageIndex(0);
      setSaveStatus("idle");
      setIsNoteFocused(false);
      
      const item = bookmarks.find((b) => b.id === selectedId);
      if (item) {
        setLocalNote((item as any).note || "");
        if (item.folder) {
          setSelectedDialogFolders(item.folder.split(",").map((f: string) => f.trim()));
        } else { 
          setSelectedDialogFolders([]); 
        }
      }
    } else { 
      document.body.style.overflow = ""; 
    }
    return () => { document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]); 

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalNote(val);
    setSaveStatus("saving"); 
    
    if (noteTimeout.current) clearTimeout(noteTimeout.current);
    
    noteTimeout.current = setTimeout(async () => {
      if (selectedItemDialog) {
        try {
          await updateBookmarkField(selectedItemDialog.id, "note", val);
        } catch (e) {
          console.error("Gagal menyimpan note", e);
        } finally {
          setSaveStatus("idle");
        }
      }
    }, 800);
  };

  useEffect(() => {
    const itemSource = selectedItemDialog?.source || "";
    if (!selectedItemDialog || !isInstagramUrl(itemSource)) {
      setInstagramVideoUrl(null); setInstagramVideoLoading(false); return;
    }
    setInstagramVideoUrl(null); setInstagramVideoLoading(true);
    const controller = new AbortController();
    fetch("/api/instagram-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: itemSource }), signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { if (data.videoUrl) setInstagramVideoUrl(data.videoUrl); })
      .catch((err) => { if (err.name !== "AbortError") console.warn("[Instagram] Fetch gagal:", err.message || err); })
      .finally(() => setInstagramVideoLoading(false));
    return () => controller.abort();
  }, [selectedItemDialog?.id, selectedItemDialog?.source]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (selectedId !== null && !isModalLeftOpen && !isModalRightOpen && !similarItems) {
        if (galleryList.length > 1) {
          if (e.key === "ArrowRight") setCurrentImageIndex((p) => (p + 1) % galleryList.length);
          else if (e.key === "ArrowLeft") setCurrentImageIndex((p) => (p - 1 + galleryList.length) % galleryList.length);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, isModalLeftOpen, isModalRightOpen, similarItems, galleryList.length]);

  const handleDialogWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    if (isModalLeftOpen || isModalRightOpen) return;
    if (e.deltaY > 20 && !similarItems && selectedItemDialog) {
      if (isCalculatingSimilar.current) return;
      isCalculatingSimilar.current = true;
      requestAnimationFrame(() => {
        const scoredItems = bookmarks.filter((b) => b.id !== selectedItemDialog.id).map((b) => ({ ...b, vibeScore: getVibeScore(selectedItemDialog, b) })).filter((b) => b.vibeScore && b.vibeScore >= 2);
        scoredItems.sort((a, b) => (b.vibeScore || 0) - (a.vibeScore || 0));
        setSimilarItems(scoredItems.slice(0, 15)); scrollUpAccumulator.current = 0; isCalculatingSimilar.current = false;
      });
    }
    if (e.deltaY < 0 && !similarItems) {
      scrollUpAccumulator.current += Math.abs(e.deltaY);
      if (scrollUpTimeout.current) clearTimeout(scrollUpTimeout.current);
      scrollUpTimeout.current = setTimeout(() => { scrollUpAccumulator.current = 0; }, 300);
      if (scrollUpAccumulator.current > 50) { setSelectedId(null); setSimilarItems(null); scrollUpAccumulator.current = 0; }
    } else if (e.deltaY > 0) { scrollUpAccumulator.current = 0; }
  }, [similarItems, selectedItemDialog, bookmarks, isModalLeftOpen, isModalRightOpen, setSimilarItems, setSelectedId]);

  const toggleDialogFolder = (folderPath: string) => {
    let newFolders = [...selectedDialogFolders];
    if (newFolders.includes(folderPath)) newFolders = newFolders.filter((f) => f !== folderPath); else newFolders.push(folderPath);
    setSelectedDialogFolders(newFolders); updateBookmarkField(selectedItemDialog!.id, "folder", newFolders.join(", "));
  };

  const renderModalFolderRow = (folder: FolderType, depth: number = 0) => {
    const isExpanded = expandedModalFolders.includes(folder.id);
    const children = folders.filter((f) => f.parentId === folder.id);
    const isChecked = selectedDialogFolders.includes(folder.fullPath || folder.name);

    return (
      <React.Fragment key={folder.id}>
        <TableRow className="border-none group/modalrow transition-colors cursor-pointer">
          {/* Padding simetris kiri-kanan (pl-5 dan pr-5) agar pas dengan header */}
          <TableCell className="py-2.5 pl-5 rounded-l-[5px] group-hover/modalrow:bg-white/10 transition-colors border-none" onClick={() => { setExpandedModalFolders((prev) => prev.includes(folder.id) ? prev.filter((id) => id !== folder.id) : [...prev, folder.id]); }}>
            <div style={{ paddingLeft: `${depth * 1}rem` }} className="flex items-center text-zinc-300 group-hover/modalrow:text-white select-none">
              {/* Ikon panah dibuat absolute agar tidak mendorong teks ke kanan */}
              <div className="relative w-0 flex items-center justify-center flex-shrink-0">
                {children.length > 0 && <ChevronRight size={14} className={`absolute right-1.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
              </div>
              <span className="text-[14.5px] font-medium tracking-tight">{toTitleCase(folder.name)}</span>
            </div>
          </TableCell>
          <TableCell className="py-2.5 pr-5 text-right rounded-r-[5px] group-hover/modalrow:bg-white/10 transition-colors border-none">
            <div className="flex justify-end"><CircularCheckbox checked={isChecked} onChange={() => toggleDialogFolder(folder.fullPath || folder.name)} /></div>
          </TableCell>
        </TableRow>
        <AnimatePresence>{isExpanded && children.length > 0 && children.map((child) => renderModalFolderRow(child, depth + 1))}</AnimatePresence>
      </React.Fragment>
    );
  };

  if (!selectedItemDialog) return null;

  const itemSource = selectedItemDialog.source || "";
  const safeExternalUrl = itemSource.startsWith("http") ? itemSource : (itemSource ? `https://${itemSource}` : "#");

  return (
    <motion.div 
      suppressHydrationWarning
      key="dialog-fullscreen" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-2xl overflow-hidden" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }} 
      onWheel={handleDialogWheel}
      onClick={(e) => { 
        if (e.target === e.currentTarget) {
          if (contextMenu) return; 
          if (isModalLeftOpen || isModalRightOpen) { 
            setIsModalLeftOpen(false); 
            setIsModalRightOpen(false); 
            return; 
          } 
          setSelectedId(null); 
          setSimilarItems(null); 
        }
      }}
    >
      {/* UPDATE PENTING: Mencoba format .otf dan fallback ke .ttf */}
      <style dangerouslySetInnerHTML={{__html: `
        @font-face {
          font-family: 'FixelTextCustom';
          src: url('/FixelText-Medium.otf') format('opentype'),
               url('/FixelText-Medium.ttf') format('truetype');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        .font-fixel-force {
          font-family: 'FixelTextCustom', system-ui, sans-serif !important;
        }
      `}} />

      <div 
        suppressHydrationWarning
        className="absolute inset-0 z-0 cursor-default" 
        onClick={(e) => { 
          if (contextMenu) return; 
          if (isModalLeftOpen || isModalRightOpen) { 
            setIsModalLeftOpen(false); setIsModalRightOpen(false); return; 
          } 
          setSelectedId(null); setSimilarItems(null); 
        }} 
      />

      {/* MAGNETIC BUTTON KIRI ATAS (KANBAN/MENU) */}
      <motion.div className="absolute top-6 left-8 z-[60]" animate={{ x: isModalLeftOpen ? 350 : 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
        <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }}>
          <motion.button initial="rest" whileHover="hover" whileTap={{ scale: 0.9 }} onClick={() => setIsModalLeftOpen(!isModalLeftOpen)} className="relative flex outline-none cursor-pointer rounded-full group focus:outline-none focus:ring-0">
            <GlassSurface width={48} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
              <Magnetic intensity={0.1} actionArea="global" range={200}>
                <div className="flex items-center justify-center relative z-10 w-full h-full text-zinc-300 hover:text-white transition-colors">
                  <motion.div animate={{ rotate: isModalLeftOpen ? 90 : -90 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <AnimatedKanban size={20} strokeWidth={2.5} />
                  </motion.div>
                </div>
              </Magnetic>
            </GlassSurface>
          </motion.button>
        </Magnetic>
      </motion.div>

      <AnimatePresence>
        {galleryList.length > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, x: isModalLeftOpen ? 350 : 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute top-1/2 -translate-y-1/2 left-8 z-[60]">
            {/* MAGNETIC BUTTON KIRI TENGAH (PREV IMAGE) */}
            <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }}>
              <motion.button initial="rest" whileHover="hover" whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((p) => (p - 1 + galleryList.length) % galleryList.length); }} className="relative flex outline-none cursor-pointer rounded-full group focus:outline-none focus:ring-0">
                <GlassSurface width={48} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
                  <Magnetic intensity={0.1} actionArea="global" range={200}>
                    <div className="flex items-center justify-center relative z-10 w-full h-full text-zinc-300 hover:text-white transition-colors">
                      <motion.div variants={{ rest: { scale: 1 }, hover: { scale: 1.15 } }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                        <ChevronLeft size={20} strokeWidth={2.5} />
                      </motion.div>
                    </div>
                  </Magnetic>
                </GlassSurface>
              </motion.button>
            </Magnetic>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAGNETIC BUTTON KANAN ATAS (ELLIPSIS/NOTES) */}
      <motion.div className="absolute top-6 right-8 z-[60]" animate={{ x: isModalRightOpen ? -350 : 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
        <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }}>
          <motion.button initial="rest" whileHover="hover" whileTap={{ scale: 0.9 }} onClick={() => setIsModalRightOpen(!isModalRightOpen)} className="relative flex outline-none cursor-pointer rounded-full group focus:outline-none focus:ring-0">
            <GlassSurface width={48} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
              <Magnetic intensity={0.1} actionArea="global" range={200}>
                <div className="flex items-center justify-center relative z-10 w-full h-full text-zinc-300 hover:text-white transition-colors">
                  <motion.div animate={{ rotate: isModalRightOpen ? 90 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <AnimatedEllipsis size={24} strokeWidth={2.5} />
                  </motion.div>
                </div>
              </Magnetic>
            </GlassSurface>
          </motion.button>
        </Magnetic>
      </motion.div>

      <AnimatePresence>
        {galleryList.length > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, x: isModalRightOpen ? -350 : 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute top-1/2 -translate-y-1/2 right-8 z-[60]">
            {/* MAGNETIC BUTTON KANAN TENGAH (NEXT IMAGE) */}
            <Magnetic intensity={0.2} actionArea="global" range={200} springOptions={{ bounce: 0.1 }}>
              <motion.button initial="rest" whileHover="hover" whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((p) => (p + 1) % galleryList.length); }} className="relative flex outline-none cursor-pointer rounded-full group focus:outline-none focus:ring-0">
                <GlassSurface width={48} height={48} borderRadius={24} blur={10} displace={0.8} redOffset={-8} className="shadow-2xl outline-none focus:outline-none focus:ring-0">
                  <Magnetic intensity={0.1} actionArea="global" range={200}>
                    <div className="flex items-center justify-center relative z-10 w-full h-full text-zinc-300 hover:text-white transition-colors">
                      <motion.div variants={{ rest: { scale: 1 }, hover: { scale: 1.15 } }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                        <ChevronRight size={20} strokeWidth={2.5} />
                      </motion.div>
                    </div>
                  </Magnetic>
                </GlassSurface>
              </motion.button>
            </Magnetic>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalLeftOpen && (
          <motion.div suppressHydrationWarning initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute left-0 top-0 h-full w-[350px] bg-zinc-950/60 backdrop-blur-3xl z-50 flex flex-col p-6 shadow-2xl" onWheel={(e) => e.stopPropagation()}>
            <h3 className="text-[11px] font-bold text-zinc-400 mb-4 uppercase tracking-widest pl-1 flex-shrink-0">Collections</h3>
            {/* Margin negatif (-mx-6) memanjangkan area agar luas, namun konten di dalamnya tetap sejajar dengan judul di atas */}
            <div className="flex-1 -mx-6 px-2 overflow-y-auto custom-scrollbar">
              <Table className="border-separate border-spacing-0 border-none">
                <TableBody className="border-none">
                  {folders.filter((f) => f.parentId === null).map((folder) => renderModalFolderRow(folder, 0))}
                </TableBody>
              </Table>
              
              <div className="mt-1">
                {!isInlineAdding ? (
                  <motion.div initial="rest" whileHover="hover" onClick={(e: any) => { e.stopPropagation(); setIsInlineAdding(true); }} className="flex items-center pl-5 pr-5 py-2.5 text-[14.5px] font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-[5px] cursor-pointer transition-colors select-none group/add border-none tracking-tight">
                    <div className="relative w-0 flex items-center justify-center flex-shrink-0">
                      <Plus size={15} className="absolute right-1.5 transition-transform group-hover/add:scale-110" />
                    </div>
                    <span className="truncate">New Collection</span>
                  </motion.div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); if (inlineAddUrl.trim()) { addFolder(inlineAddUrl.trim(), null); setIsInlineAdding(false); setInlineAddUrl(""); } }} className="flex flex-col mx-0 my-1 bg-zinc-950/50 rounded-[5px] overflow-hidden border border-zinc-800/50 shadow-inner">
                    <div className="p-2 pb-1 pl-5">
                      <input autoFocus type="text" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500 font-sans border-none" placeholder="Name..." value={inlineAddUrl} onChange={(e) => setInlineAddUrl(e.target.value)} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 pl-4 mt-1 border-t border-zinc-800/50 bg-zinc-900/30">
                      <motion.button initial="rest" whileHover="hover" type="button" onClick={(e: any) => { e.stopPropagation(); setIsInlineAdding(false); }} className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1.5 rounded transition-colors cursor-pointer outline-none border-none"><ChevronLeft size={14} className="transition-transform group-hover:scale-110" /></motion.button>
                      <button type="submit" className="text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-300 px-3 py-1.5 rounded transition-colors cursor-pointer border-none">Save</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalRightOpen && (
          <motion.div suppressHydrationWarning initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute right-0 top-0 h-full w-[350px] bg-zinc-950/60 backdrop-blur-3xl z-50 flex flex-col pt-6 shadow-2xl overflow-hidden" onWheel={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 relative flex flex-col">
              
              <div className="flex flex-col mb-8 mt-0 w-full overflow-hidden shrink-0">
                <a href={safeExternalUrl !== "#" ? safeExternalUrl : undefined} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:text-blue-400 truncate font-semibold font-sans block w-full">
                  {formatLinkDisplay(itemSource)}
                </a>
                <span className="text-zinc-500 text-[11px] font-sans mt-0">
                  {formatItemDate(selectedItemDialog.id)}
                </span>
              </div>
              
              <div className="relative mb-2 shrink-0 bg-gradient-to-b from-white/10 to-transparent" style={{ borderRadius: "16px" }}>
                <AnimatePresence>
                  {localNote.trim() === "" && !isNoteFocused && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="absolute inset-0 p-3 pointer-events-none"
                    >
                      <div className="font-sans text-sm font-medium bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 bg-[length:200%_auto] bg-clip-text text-transparent opacity-50">
                        Type a note here...
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* MIRROR DIV: untuk mewarnai #tag — tidak mempengaruhi layout apapun */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 p-3 text-sm font-sans pointer-events-none z-0 overflow-hidden whitespace-pre-wrap break-words"
                  style={{ borderRadius: "16px" }}
                >
                  {noteActiveSuggestion ? (() => {
                    // Ada suggestion: render teks sebelum suggestion, tag typed, suggestion ghost, teks sesudah
                    const splitIdx = noteCursorPos - noteActiveSuggestion.typed.length;
                    const before = localNote.slice(0, splitIdx);
                    const after = localNote.slice(noteCursorPos);
                    return (
                      <>
                        {before.split(/(#[\w\u00C0-\u024F\u4E00-\u9FFF]+)/g).map((p, i) =>
                          p.match(/^#[\w\u00C0-\u024F\u4E00-\u9FFF]+$/) ? (
                            <span key={i} style={{ background: "linear-gradient(90deg, #ffaa40, #9c40ff, #ffaa40)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradient 4s linear infinite" }}>{p}</span>
                          ) : (
                            <span key={i} style={{ color: "#a1a1aa" }}>{p}</span>
                          )
                        )}
                        <span style={{ background: "linear-gradient(90deg, #ffaa40, #9c40ff, #ffaa40)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradient 4s linear infinite" }}>{noteActiveSuggestion.typed}</span>
                        <span style={{ background: "linear-gradient(90deg, #ffaa40, #9c40ff, #ffaa40)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradient 4s linear infinite", opacity: 0.4 }}>{noteActiveSuggestion.remaining}</span>
                        {after.split(/(#[\w\u00C0-\u024F\u4E00-\u9FFF]+)/g).map((p, i) =>
                          p.match(/^#[\w\u00C0-\u024F\u4E00-\u9FFF]+$/) ? (
                            <span key={i} style={{ background: "linear-gradient(90deg, #ffaa40, #9c40ff, #ffaa40)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradient 4s linear infinite" }}>{p}</span>
                          ) : (
                            <span key={i} style={{ color: "#a1a1aa" }}>{p}</span>
                          )
                        )}
                      </>
                    );
                  })() : (
                    localNote.split(/(#[\w\u00C0-\u024F\u4E00-\u9FFF]+)/g).map((part, i) =>
                      part.match(/^#[\w\u00C0-\u024F\u4E00-\u9FFF]+$/) ? (
                        <span key={i} style={{ background: "linear-gradient(90deg, #ffaa40, #9c40ff, #ffaa40)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradient 4s linear infinite" }}>{part}</span>
                      ) : (
                        <span key={i} style={{ color: "#a1a1aa" }}>{part}</span>
                      )
                    )
                  )}
                </div>

                <textarea 
                  ref={noteRef}
                  value={localNote}
                  onChange={handleNoteChange}
                  onFocus={() => setIsNoteFocused(true)}
                  onBlur={() => {
                    setIsNoteFocused(false);
                    if (selectedItemDialog && localNote !== (selectedItemDialog as any).note) {
                      updateBookmarkField(selectedItemDialog.id, "note", localNote);
                    }
                  }}
                  onSelect={() => setNoteCursorPos(noteRef.current?.selectionStart ?? 0)}
                  onKeyUp={() => setNoteCursorPos(noteRef.current?.selectionStart ?? 0)}
                  onClick={() => setNoteCursorPos(noteRef.current?.selectionStart ?? 0)}
                  onKeyDown={(e) => {
                    if ((e.key === "Tab" || e.key === "ArrowRight") && noteActiveSuggestion) {
                      e.preventDefault();
                      const before = localNote.slice(0, noteCursorPos);
                      const after = localNote.slice(noteCursorPos);
                      const newText = before + noteActiveSuggestion.remaining + after;
                      const newPos = noteCursorPos + noteActiveSuggestion.remaining.length;
                      handleNoteChange({ target: { value: newText } } as any);
                      setTimeout(() => {
                        noteRef.current?.setSelectionRange(newPos, newPos);
                        setNoteCursorPos(newPos);
                      }, 0);
                    }
                  }}
                  className="w-full bg-transparent p-3 text-sm text-transparent caret-white focus:outline-none resize-none h-[140px] font-sans relative z-10" 
                  style={{ borderRadius: "16px" }} 
                  placeholder="" 
                />
                
                <AnimatePresence>
                  {saveStatus === "saving" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-3 right-4 flex items-center justify-center pointer-events-none z-20">
                      <Loader2 size={14} className="animate-spin text-zinc-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mb-2 shrink-0 px-1">
                <AnimatedGradientText speed={1.5} colorFrom="#ffaa40" colorTo="#9c40ff" className="text-[12px] font-bold uppercase tracking-widest">
                  AI Summary
                </AnimatedGradientText>
              </div>
              
              <div className="flex-1 px-1 font-fixel-force text-[15px] text-[#9f9fa9] leading-relaxed whitespace-pre-wrap">
                {(selectedItemDialog.tldr || "Belum ada ringkasan AI untuk tautan ini.").replace(/\[|\]/g, "").trim()}
              </div>

              <div className="h-24 shrink-0" />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none" style={{ height: "8rem" }}>
              <GradualBlur position="bottom" height="8rem" strength={3} divCount={5} curve="bezier" exponential />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        suppressHydrationWarning 
        className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none group/carousel"
        animate={{
          paddingLeft: isModalLeftOpen ? 360 : 0,
          paddingRight: isModalRightOpen ? 360 : 0,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {(() => {
          const ytMatch = itemSource.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
          const isYouTube = !!ytMatch; const ytId = ytMatch ? ytMatch[1] : null;
          const currentMediaUrl = galleryList[currentImageIndex];
          
          // PENENTUAN VIDEO YANG SANGAT KETAT:
          // Jika URL tidak explicitly memiliki format video, kita asumsikan ia adalah GAMBAR!
          const isVideoExt = currentMediaUrl && currentMediaUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
          const isTwitterVideo = currentMediaUrl && currentMediaUrl.includes("video.twimg.com");
          const isMicrolinkVideo = currentMediaUrl && currentMediaUrl.includes("microlink.io") && currentMediaUrl.includes("video");
          
          const isDirectVideo = !!(isVideoExt || isTwitterVideo || isMicrolinkVideo);
          
          const directVideoUrl = isDirectVideo ? getProxiedVideoUrl(currentMediaUrl) : currentMediaUrl;

          return (
            <>
              {/* EFEK PENCAHAYAAN SINEMATIK STATIS (Hanya untuk gambar biasa, video diurus oleh playernya sendiri) */}
              {!isDirectVideo && !isInstagramUrl(itemSource) && !isYouTube && (
                <div 
                  className="absolute inset-[-40%] w-[180%] h-[180%] flex items-center justify-center pointer-events-none -z-10 overflow-visible"
                  style={{ maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)" }}
                >
                  <img 
                    src={galleryList[currentImageIndex] || selectedItemDialog.image} 
                    alt="" 
                    className="w-full h-full object-cover blur-[120px] saturate-150 opacity-50" 
                  />
                </div>
              )}

              <AnimatePresence mode="wait">
                {isYouTube && currentImageIndex === 0 ? (
                  <motion.div key="youtube-player" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.2 }} className="relative w-full max-w-6xl aspect-video max-h-[80vh] flex items-center justify-center pointer-events-none">
                    {/* YOUTUBE AMBIENT MODE (Blurred thumbnail) */}
                    <div 
                      className="absolute inset-[-50%] w-[200%] h-[200%] pointer-events-none -z-10"
                      style={{ maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)" }}
                    >
                      <img src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} alt="" className="w-full h-full object-cover blur-[120px] saturate-150 opacity-50" />
                    </div>
                    {/* YOUTUBE MAIN PLAYER */}
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl pointer-events-auto bg-black relative z-10">
                      <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                  </motion.div>
                ) : isInstagramUrl(itemSource) ? (
                  instagramVideoLoading ? (
                    <motion.div 
                      key="instagram-loading" 
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 1.02 }} 
                      transition={{ duration: 0.2 }}
                      className="relative inline-flex items-center justify-center pointer-events-none" 
                    >
                      <img src={selectedItemDialog.image} alt={selectedItemDialog.title} className="max-w-[80vw] max-h-[80vh] w-auto h-auto object-contain rounded-2xl opacity-60 blur-sm shadow-2xl" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
                           <Loader2 size={32} strokeWidth={2} className="animate-spin text-white" />
                        </div>
                        <span className="text-[10px] text-white/80 font-bold tracking-[0.2em] uppercase drop-shadow-md">Menyiapkan Video...</span>
                      </div>
                    </motion.div>
                  ) : instagramVideoUrl ? (
                    // FIX KRUSIAL: Default ke GAMBAR, kecuali URL-nya 100% dipastikan format video!
                    (instagramVideoUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) ? (
                      <motion.div 
                        key="instagram-video" 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 1.02 }} 
                        transition={{ duration: 0.2 }} 
                        className="relative max-w-full max-h-[80vh] pointer-events-auto rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center bg-black" 
                      >
                        <CustomVideoPlayer
                          src={instagramVideoUrl}
                          poster={selectedItemDialog.image}
                          onError={(e) => {
                            console.warn("[Instagram] Video error, retrying...");
                            (e.currentTarget as HTMLVideoElement).load();
                          }}
                        >
                          <motion.a href={safeExternalUrl !== "#" ? safeExternalUrl : undefined} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 0, y: 0 }} whileHover={{ opacity: 1 }} className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 hover:bg-black/80 backdrop-blur-md px-3 py-2 rounded-full text-[11px] font-semibold text-white border border-white/20 shadow-lg transition-all z-10"><AnimatedSquareArrowOutUpRight size={12} /> Instagram</motion.a>
                        </CustomVideoPlayer>
                      </motion.div>
                    ) : (
                      <motion.img 
                        key="instagram-image-cobalt" 
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.2 }} 
                        src={instagramVideoUrl} alt={selectedItemDialog.title} 
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-auto cursor-pointer transition-transform hover:scale-[1.02]" 
                        onClick={() => { if(safeExternalUrl !== "#") window.open(safeExternalUrl, "_blank") }} 
                      />
                    )
                  ) : (
                    <motion.div key="instagram-fallback" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.2 }} className="relative flex flex-col items-center gap-5 pointer-events-auto">
                      <img src={selectedItemDialog.image} alt={selectedItemDialog.title} className="max-w-[80vw] max-h-[50vh] w-auto h-auto object-contain rounded-xl opacity-60" />
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p className="text-sm text-zinc-400 font-sans">Video tidak bisa diputar secara langsung</p>
                        <a href={safeExternalUrl !== "#" ? safeExternalUrl : undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"><AnimatedSquareArrowOutUpRight size={14} /> Buka di Instagram</a>
                      </div>
                    </motion.div>
                  )
                ) : isDirectVideo ? (
                  <motion.div 
                    key={`vid-wrap-${selectedItemDialog.id}-${currentImageIndex}`} 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 1.02 }} 
                    transition={{ duration: 0.2 }} 
                    className="relative max-w-full max-h-[80vh] rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex items-center justify-center bg-black" 
                  >
                    <CustomVideoPlayer
                      src={directVideoUrl}
                      poster={selectedItemDialog.image}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const vid = e.currentTarget as HTMLVideoElement;
                        const originalUrl = galleryList[currentImageIndex];
                        if (vid.src !== originalUrl) {
                          console.warn("Proxy gagal, coba URL langsung:", originalUrl);
                          vid.src = originalUrl;
                        }
                      }}
                    >
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        whileHover={{ opacity: 1 }} 
                        className="absolute top-6 right-6 opacity-0 transition-opacity z-50"
                      >
                        <a href={galleryList[currentImageIndex]} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/60 hover:bg-black/90 backdrop-blur-md px-4 py-2.5 rounded-full text-xs font-bold text-white transition-colors border border-white/20 shadow-xl"><AnimatedSquareArrowOutUpRight size={14} /> Buka Video Original</a>
                      </motion.div>
                    </CustomVideoPlayer>
                  </motion.div>
                ) : (
                  <motion.img key={`img-${currentImageIndex}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.2 }} src={galleryList[currentImageIndex]} alt={selectedItemDialog.title} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-auto cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => { if(safeExternalUrl !== "#") window.open(safeExternalUrl, "_blank") }} />
                )}
              </AnimatePresence>

              {galleryList.length > 1 && !isInstagramUrl(itemSource) && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto opacity-0 group-hover/carousel:opacity-100 transition-opacity z-50 drop-shadow-md">
                  {galleryList.map((_: any, idx: number) => (
                    <div key={idx} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }} className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${idx === currentImageIndex ? "bg-white scale-125 w-4 shadow-sm" : "bg-white/60 hover:bg-white/90 shadow-sm"}`} />
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {!similarItems && !isModalLeftOpen && !isModalRightOpen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.5, y: 0 }} transition={{ delay: 1 }} className="absolute -bottom-16 flex flex-col items-center gap-2 pointer-events-none">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-5 h-8 border-2 border-white/30 rounded-full flex justify-center p-1 backdrop-blur-md"><div className="w-1 h-2 bg-white/60 rounded-full" /></motion.div>
          </motion.div>
        )}

        <AnimatePresence>
          {similarItems && (
            <motion.div suppressHydrationWarning initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 z-30 flex flex-col pt-16 px-8 pb-8 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 cursor-default overflow-hidden pointer-events-auto" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setLocalMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); }} onWheel={(e) => { const scrollContainer = document.getElementById("same-vibes-scroll"); if (scrollContainer) { if (scrollContainer.scrollTop <= 0 && e.deltaY < 0) { setSimilarItems(null); return; } e.stopPropagation(); } }} onClick={(e) => { if (contextMenu) { setContextMenu(null); return; } if (e.target === e.currentTarget) setSimilarItems(null); }}>
              <div className="absolute inset-0 -z-20 bg-black pointer-events-none rounded-2xl" />
              <div className="absolute inset-0 -z-10 pointer-events-none rounded-2xl opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(800px circle at ${localMousePos.x}px ${localMousePos.y}px, rgba(255,255,255,0.05), transparent 40%)` }} />
              {similarItems.length > 0 ? (
                <div id="same-vibes-scroll" className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-12 px-2 -mx-2 pointer-events-none z-10 h-full" style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)" }}>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pointer-events-auto min-h-full content-start p-2" onClick={(e) => { if (contextMenu) { e.stopPropagation(); setContextMenu(null); } else if (e.target === e.currentTarget) setSimilarItems(null); }}>
                    {similarItems.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05, y: -5 }} className="group relative aspect-square rounded-2xl overflow-hidden bg-black/20 border border-white/10 cursor-pointer shadow-2xl hover:border-white/30 transition-all duration-500" onClick={(e) => { e.stopPropagation(); if (contextMenu) { setContextMenu(null); return; } setSelectedId(item.id); setSimilarItems(null); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, cardId: item.id }); }}>
                        <img src={item.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center z-10 h-full" onClick={(e) => { if (contextMenu) { setContextMenu(null); return; } if (e.target === e.currentTarget) setSimilarItems(null); }}><Sparkles size={48} className="opacity-20 text-white pointer-events-none" /></div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}