"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Loader2, Plus, ArrowLeft, Trash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { BookmarkCard, BookmarkSkeleton } from "./BookmarkCard";
import BookmarkPreview from "./BookmarkPreview";
import { TopLeftControls, TopRightControls } from "./TopControls";
import { extractImageFeatures, copyToClipboardFallback, toTitleCase, isInstagramUrl } from "@/lib/utils/helpers";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MainContent() {
  const {
    currentView, currentFolderId, colCount, setColCount, folders, addFolder, updateFolderName, deleteFolder,
    viewMode, globalSearchQuery, bookmarks, setBookmarks, semanticResults, cardSettings,
  } = useAppContext();
  
  const [isSaving, setIsSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [selectedCards, setSelectedCards] = useState<(number | string)[]>([]);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cardId: number | string; } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteQuery, setNoteQuery] = useState("");
  
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
    const before = noteQuery.slice(0, noteCursorPos);
    const match = before.match(/(#[\w\u00C0-\u024F\u4E00-\u9FFF]+)$/);
    if (!match) return null;
    const typed = match[1].toLowerCase();
    const found = allTags.find(t => t.startsWith(typed) && t.length > typed.length);
    if (!found) return null;
    return { typed: match[1], remaining: found.slice(typed.length) };
  }, [noteQuery, noteCursorPos, allTags]);

  // State untuk List Folder dan "Ghost Folder"
  const [showFolderList, setShowFolderList] = useState(false);
  const [tempNewFolders, setTempNewFolders] = useState<string[]>([]); // Menyimpan nama folder yang baru dibuat di sesi ini
  
  const [similarItems, setSimilarItems] = useState<any[] | null>(null);
  const [localMousePos, setLocalMousePos] = useState({ x: 0, y: 0 });

  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineAddUrl, setInlineAddUrl] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault(); 
      if (e.dataTransfer && !e.dataTransfer.types.includes("Files")) { e.dataTransfer.dropEffect = "move"; }
      if (isDraggingCard && e.clientX !== 0 && e.clientY !== 0) { dragX.set(e.clientX); dragY.set(e.clientY); }
    };
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault(); 
      if (e.dataTransfer && !e.dataTransfer.types.includes("Files")) { e.dataTransfer.dropEffect = "move"; }
    };
    const handleGlobalDrop = (e: DragEvent) => {
      if (e.dataTransfer && !e.dataTransfer.types.includes("Files")) { e.preventDefault(); }
      document.getElementById("drag-cursor-override")?.remove();
    };
    const handleGlobalDragEnd = () => {
      document.getElementById("drag-cursor-override")?.remove();
      setIsDraggingCard(false); setDraggedItem(null);
    };

    document.addEventListener("dragover", handleGlobalDragOver, { capture: true, passive: false });
    document.addEventListener("dragenter", handleGlobalDragEnter, { capture: true, passive: false });
    document.addEventListener("drop", handleGlobalDrop, { capture: true, passive: false });
    document.addEventListener("dragend", handleGlobalDragEnd, { capture: true });

    return () => {
      document.removeEventListener("dragover", handleGlobalDragOver, { capture: true });
      document.removeEventListener("dragenter", handleGlobalDragEnter, { capture: true });
      document.removeEventListener("drop", handleGlobalDrop, { capture: true });
      document.removeEventListener("dragend", handleGlobalDragEnd, { capture: true });
    };
  }, [isDraggingCard, dragX, dragY]);

  useEffect(() => { setVisibleCount(30); }, [currentFolderId, globalSearchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Cegah menu tertutup jika elemen yang diklik sudah dihapus dari DOM
      if (!document.body.contains(target)) return;
      
      if (target.closest("#smart-context-menu")) return;
      if (contextMenu) { 
        setContextMenu(null); 
        setSearchQuery(""); 
        setShowFolderList(false); 
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Element;
      if (target && target.closest && target.closest("#smart-context-menu")) {
        return; // Jangan tutup jika yang di-scroll adalah isi dari context menu itu sendiri
      }

      if (contextMenu) {
        setContextMenu(null);
        setSearchQuery("");
        setShowFolderList(false);
      }
    };
    
    document.addEventListener("click", handleClick); 
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, { capture: true } as EventListenerOptions);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (contextMenu) {
      const item = bookmarks.find((b) => b.id === contextMenu.cardId);
      setNoteQuery(item?.note || "");
    } else {
      setShowFolderList(false);
      setTempNewFolders([]); // Reset folder temporary saat menu tertutup
    }
  }, [contextMenu, bookmarks]);

  const isInsideFolder = currentView === "folder" && currentFolderId !== null;
  let displayedBookmarks = bookmarks;

  if (globalSearchQuery.trim()) {
    const query = globalSearchQuery.toLowerCase();
    const colorMap: Record<string, (c: any) => boolean> = {
      merah: (c) => (c.h >= 340 || c.h <= 20) && c.s > 30 && c.l > 15 && c.l < 85,
      biru: (c) => c.h >= 190 && c.h <= 260 && c.s > 30 && c.l > 15 && c.l < 85,
      hijau: (c) => c.h >= 80 && c.h <= 160 && c.s > 30 && c.l > 15 && c.l < 85,
      kuning: (c) => c.h >= 40 && c.h <= 65 && c.s > 30 && c.l > 30,
      hitam: (c) => c.l < 25, putih: (c) => c.l > 85, abu: (c) => c.s < 20 && c.l >= 25 && c.l <= 85,
      coklat: (c) => c.h >= 15 && c.h <= 45 && c.s > 20 && c.l >= 20 && c.l <= 60,
      pink: (c) => c.h >= 290 && c.h <= 340 && c.s > 30 && c.l > 40,
      ungu: (c) => c.h >= 260 && c.h <= 290 && c.s > 30 && c.l > 15 && c.l < 85,
      orange: (c) => c.h >= 20 && c.h <= 45 && c.s > 50 && c.l > 40,
    };
    let remainingQuery = query; let matchedColorFn: ((c: any) => boolean) | null = null;
    for (const color in colorMap) {
      if (query.includes(color)) { matchedColorFn = colorMap[color]; remainingQuery = query.replace(color, "").trim(); break; }
    }
    const searchWords = remainingQuery.split(" ").filter((w) => w.trim().length > 0);

    displayedBookmarks = displayedBookmarks.filter((b) => {
      let colorMatch = matchedColorFn && b.colorFeatures ? matchedColorFn(b.colorFeatures) : false;
      const checkText = (word: string) => !!(
        b.title?.toLowerCase().includes(word) || b.tldr?.toLowerCase().includes(word) || 
        b.note?.toLowerCase().includes(word) || b.tags?.some((tag: string) => tag.toLowerCase().includes(word)) || 
        b.folder?.toLowerCase().includes(word) || b.source?.toLowerCase().includes(word)
      );
      let textMatch = searchWords.length > 0 ? searchWords.every(checkText) : true;
      if (matchedColorFn) { if (searchWords.length > 0) return colorMatch && textMatch; return colorMatch; } else { return textMatch; }
    });

    if (semanticResults && semanticResults.length > 0) {
      const combined = [...displayedBookmarks];
      semanticResults.forEach((sem) => {
        if (!combined.find((b) => b.id === sem.id)) { const originalCard = bookmarks.find((b) => b.id === sem.id); if (originalCard) combined.push(originalCard); }
      });
      displayedBookmarks = combined;
    }
  }

  let currentFolderName = "";
  if (isInsideFolder) {
    const fol = folders.find((c) => c.id === currentFolderId);
    if (fol) { 
      currentFolderName = fol.name; 
      displayedBookmarks = displayedBookmarks.filter((b) => {
        if (!b.folder) return false;
        const foldersArray = b.folder.split(",").map((f: string) => f.trim());
        return foldersArray.includes(fol.name) || foldersArray.includes(fol.fullPath || "");
      }); 
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((prev) => Math.min(prev + 30, displayedBookmarks.length));
    }, { root: null, rootMargin: "400px", threshold: 0.1 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [displayedBookmarks.length]);

  const isSingleColumnMode = viewMode === "list" || viewMode === "timeline";
  const effectiveCols = isSingleColumnMode ? 1 : colCount;
  const columns = Array.from({ length: effectiveCols }, () => [] as any[]);
  const paginatedBookmarks = displayedBookmarks.slice(0, visibleCount);
  paginatedBookmarks.forEach((item, index) => columns[index % effectiveCols].push(item));

  const gridColsClass = isSingleColumnMode 
    ? "grid-cols-1 max-w-4xl mx-auto" 
    : {
        2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4",
        5: "grid-cols-5", 6: "grid-cols-6", 7: "grid-cols-7", 8: "grid-cols-8"
      }[effectiveCols] || "grid-cols-5";

  const updateBookmarkField = async (id: number | string, field: string, value: string) => {
    const dbField = field === "folder" ? "folder" : field === "tldr" ? "description" : field;
    await supabase.from("bookmarks").update({ [dbField]: value }).eq("id", id);
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleSaveAction = async (rawInputUrl: string, targetFolder: string = "") => {
    const inputUrl = rawInputUrl.trim().startsWith("http") ? rawInputUrl.trim() : `https://${rawInputUrl.trim()}`;
    const cleanInputUrl = inputUrl.replace(/\/$/, "").toLowerCase();
    const isDuplicate = bookmarks.some((b) => b.source.replace(/\/$/, "").toLowerCase() === cleanInputUrl);
    
    if (isDuplicate) { throw new Error("Duplicate link"); }

    setIsSaving(true);
    let domainName = "Link"; try { domainName = new URL(inputUrl).hostname.replace("www.", ""); } catch (error) {}
    let finalImageUrl = `https://www.google.com/s2/favicons?domain=${domainName}&sz=256`;
    let finalTitle = domainName;
    let galleryFromApi: string[] = [];

    const isImage = inputUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) || inputUrl.includes("images.unsplash.com") || inputUrl.includes("i.pinimg.com") || inputUrl.includes("cdninstagram.com");
    let youtubeVideoId = null;
    if (inputUrl.includes("youtube.com") || inputUrl.includes("youtu.be")) {
      const match = inputUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (match && match[1]) youtubeVideoId = match[1];
    }

    if (inputUrl.includes("x.com") || inputUrl.includes("twitter.com")) {
      try {
        const urlObj = new URL(inputUrl);
        const cleanPath = urlObj.pathname.replace(/\/(photo|video)\/\d+\/?$/, '');
        const vxData = await (await fetch(`https://api.vxtwitter.com${cleanPath}`)).json();
        if (vxData?.mediaURLs?.length > 0) {
          galleryFromApi = vxData.mediaURLs;
          finalImageUrl = vxData.mediaURLs[0];
          if (vxData.media_extended && vxData.media_extended.length > 0) {
             finalImageUrl = vxData.media_extended[0].thumbnail_url || vxData.media_extended[0].url;
          }
          finalTitle = `Post by ${vxData.user_name || "X User"}`;
        }
      } catch (err) {
        console.warn("Gagal menarik data X/Twitter:", err);
      }
    } else if (isInstagramUrl(inputUrl)) {
      try {
        const data = await (await fetch(`https://api.microlink.io/?url=${encodeURIComponent(inputUrl)}&screenshot=true&meta=true`)).json();
        if (data.status === "success") {
          finalImageUrl = data.data.image?.url || data.data.screenshot?.url || finalImageUrl;
          finalTitle = data.data.title || finalTitle;
        }
      } catch (err) {}
      galleryFromApi = [];
    } else if (galleryFromApi.length === 0) {
      if (isImage) { finalImageUrl = inputUrl; finalTitle = "Saved Image"; galleryFromApi = [inputUrl]; } 
      else if (youtubeVideoId) { finalImageUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`; finalTitle = "YouTube Video"; galleryFromApi = [finalImageUrl]; } 
      else {
        try {
          const data = await (await fetch(`https://api.microlink.io/?url=${encodeURIComponent(inputUrl)}&video=true&screenshot=true&meta=true`)).json();
          if (data.status === "success") {
            const isImageLogo = data.data.image?.url && (data.data.image.url.toLowerCase().includes("logo") || data.data.image.url.toLowerCase().includes("icon") || data.data.image.url.toLowerCase().includes("badge"));
            const isPinterest = inputUrl.includes("pinterest.com") || inputUrl.includes("pin.it");
            finalImageUrl = (isPinterest || isImageLogo || !data.data.image?.url) ? (data.data.screenshot?.url || `https://image.thum.io/get/width/600/crop/800/noanimate/${inputUrl}`) : data.data.image.url;
            galleryFromApi = data.data.video?.url ? [data.data.video.url] : [finalImageUrl];
            finalTitle = data.data.title || finalTitle;
          }
        } catch (err) { finalImageUrl = `https://image.thum.io/get/width/600/crop/800/noanimate/${inputUrl}`; galleryFromApi = [finalImageUrl]; }
      }
    }

    const imageFeatures = await extractImageFeatures(finalImageUrl);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiResponse = await fetch("/api/tldr", { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "" 
        }, 
        body: JSON.stringify({ 
          url: inputUrl, imageUrl: finalImageUrl, title: finalTitle, folder: targetFolder, colorFeatures: imageFeatures, gallery: galleryFromApi 
        }) 
      });
      const data = await apiResponse.json();
      
      if (apiResponse.ok && data.dbData) {
        const db = data.dbData;
        const realCard = { id: db.id, title: db.title, source: db.url, image: db.image_url, tldr: db.description, tags: db.ai_tags, folder: db.folder, colorFeatures: { h: db.color_h, s: db.color_s, l: db.color_l }, gallery: db.gallery || [db.image_url] };
        
        setBookmarks((prev) => [realCard, ...prev]);
      }
    } catch (e: any) { 
        console.warn("[Save Error]", e.message || e);
    } finally {
        setTimeout(() => { setIsSaving(false); }, 1500);
    }
  };

  // Posisi menu dinamis ngajaga bisi katerjang wates browser
  let menuX = contextMenu?.x || 0;
  let menuY = contextMenu?.y || 0;
  if (typeof window !== "undefined" && contextMenu) {
    if (menuX + 320 > window.innerWidth) menuX = window.innerWidth - 320;
    if (menuY + 520 > window.innerHeight) menuY = window.innerHeight - 530;
    if (menuY < 20) menuY = 20; 
  }

  // Mendapatkan Data Kartu dan Folders Aktif untuk Multi-Select
  const activeCard = contextMenu ? bookmarks.find((b) => b.id === contextMenu.cardId) : null;
  const activeFolders = activeCard?.folder ? activeCard.folder.split(",").map(f => f.trim()) : ["Uncategorized"];

  // -------------------------------------------------------------
  // MENGGABUNGKAN DATABASE ASLI & GHOST FOLDER (Optimistic UI)
  // -------------------------------------------------------------
  const allCombinedFolders = [...folders];
  tempNewFolders.forEach(tempName => {
    if (!allCombinedFolders.find(f => f.name.toLowerCase() === tempName.toLowerCase())) {
      allCombinedFolders.push({
         id: `temp-${tempName}` as any, // Dummy ID
         name: tempName,
         colorClass: "bg-zinc-500",
         parentId: null
      });
    }
  });

  // Logika Multi-Select Folder & "Hangus" Batal Bikin
  const handleToggleFolder = (folderName: string) => {
    if (!contextMenu) return;
    let newFolders = [...activeFolders];
    
    if (folderName === "Uncategorized") {
      newFolders = ["Uncategorized"];
    } else {
      if (newFolders.includes(folderName)) {
        // UNSELECT / UNCHECK
        newFolders = newFolders.filter(f => f !== folderName);
        
        // JIKA INI GHOST FOLDER YANG BARU SAJA DIBUAT -> HANGUSKAN!
        if (tempNewFolders.includes(folderName)) {
           // 1. Hapus dari UI Local
           setTempNewFolders(prev => prev.filter(t => t !== folderName));
           // 2. Cari di database dan musnahkan selamanya
           const folderToDelete = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
           if (folderToDelete) {
             deleteFolder(folderToDelete.id);
           } else {
             // Backup: jika delay jaringan, tunggu sejenak lalu hapus
             setTimeout(() => {
                const f = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
                if (f) deleteFolder(f.id);
             }, 2000);
           }
        }
      } else {
        // SELECT / CHECK
        newFolders.push(folderName);
      }
      
      if (newFolders.includes("Uncategorized")) {
        newFolders = newFolders.filter(f => f !== "Uncategorized");
      }
      if (newFolders.length === 0) newFolders = ["Uncategorized"];
    }
    
    updateBookmarkField(contextMenu.cardId, "folder", newFolders.join(", "));
  };

  // Logika Cek Exact Match menggunakan Combined Folders
  const queryTrimmed = searchQuery.trim();
  const exactMatch = allCombinedFolders.find((c) => c.name.toLowerCase() === queryTrimmed.toLowerCase()) || queryTrimmed.toLowerCase() === "uncategorized";
  const showCreateNew = queryTrimmed !== "" && !exactMatch;
  const filteredFolders = allCombinedFolders.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div 
      className="flex-1 w-full relative min-h-screen flex flex-col"
      onDragOver={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
      onDragEnter={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
    >
      <img id="empty-drag-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: "none" }} />

      <AnimatePresence>
        {isDraggingCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-zinc-950/70 backdrop-blur-[2px] z-[25] pointer-events-none" />
        )}
      </AnimatePresence>

      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isDraggingCard && draggedItem && (
            <motion.div className="fixed top-0 left-0 z-[99999] pointer-events-none" style={{ x: dragX, y: dragY }}>
              <motion.div initial={{ opacity: 0, scale: 1, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="-translate-x-1/2 -translate-y-1/2 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/20 flex items-center gap-2 whitespace-nowrap">
                 <p className="text-white text-sm font-semibold truncate max-w-[200px]">{draggedItem.title}</p>
                 {selectedCards.includes(draggedItem.id) && selectedCards.length > 1 && (
                   <div className="bg-blue-500 rounded-full px-2 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">+{selectedCards.length - 1}</div>
                 )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <TopLeftControls />
      <TopRightControls onSave={handleSaveAction} />

      <ScrollArea 
        className="flex-1 h-full w-full custom-scrollbar"
        onDragOver={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
        onDragEnter={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
      >
        <div className="w-full px-8 pt-28 pb-12 min-h-screen" onClick={() => { if (contextMenu) return; if (selectedCards.length > 0) setSelectedCards([]); }}>
          
          {isInsideFolder && (
            <div className="group relative flex items-center justify-between mb-10 w-full px-2">
              <h1 className="text-5xl text-white outline-none border-b border-transparent focus:border-white/20 transition-colors pb-2" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, overflow: "visible" }} contentEditable suppressContentEditableWarning onBlur={(e) => { const newName = e.currentTarget.textContent || ""; if (newName.trim() && newName.trim().toLowerCase() !== currentFolderName.toLowerCase()) { updateFolderName(currentFolderId!, newName.trim()); } }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}>
                {toTitleCase(currentFolderName)}
              </h1>
              <button onClick={() => deleteFolder(currentFolderId!)} className="opacity-0 group-hover:opacity-100 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-medium transition-all flex-shrink-0">
                <Trash size={16} /> Delete
              </button>
            </div>
          )}

          <div 
            className={`grid ${gridColsClass} gap-[60px] w-full items-start`}
            onDragOver={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
            onDragEnter={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
          >
            {columns.map((col, colIndex) => (
              <div 
                key={colIndex} 
                className="flex flex-col gap-[30px] w-full"
                onDragOver={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
                onDragEnter={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "move"; }}
              >
                <AnimatePresence>
                  
                  {colIndex === 0 && isInsideFolder && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="w-full">
                      {!isInlineAdding ? (
                        <div onClick={(e) => { e.stopPropagation(); setIsInlineAdding(true); }} className="w-full text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-2 flex items-center gap-2 text-sm font-medium group"><span className="group-hover:text-white transition-colors">New Collection</span></div>
                      ) : (
                        <div onClick={(e) => e.stopPropagation()} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 flex flex-col relative shadow-2xl">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase mb-3">New Folder</span>
                          <input autoFocus value={inlineAddUrl} onChange={(e) => setInlineAddUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (inlineAddUrl.trim()) { addFolder(inlineAddUrl.trim(), currentFolderId); setIsInlineAdding(false); setInlineAddUrl(""); } } else if (e.key === "Escape") { setIsInlineAdding(false); } }} placeholder="Name..." className="bg-transparent text-sm text-white outline-none w-full mb-4 border-b border-zinc-700 pb-1 focus:border-zinc-400 transition-colors font-sans" />
                          <div className="flex justify-between items-center mt-auto"><ArrowLeft onClick={() => setIsInlineAdding(false)} className="text-zinc-400 hover:text-white cursor-pointer transition-transform hover:-translate-x-1" size={16} /><button onClick={() => { if (inlineAddUrl.trim()) { addFolder(inlineAddUrl.trim(), currentFolderId); setIsInlineAdding(false); setInlineAddUrl(""); } }} className="bg-white text-black px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-zinc-200 transition-colors">Create</button></div>
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {colIndex === 0 && isSaving && (
                    <motion.div key="skeleton-loader" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="w-full z-10"><BookmarkSkeleton /></motion.div>
                  )}
                  
                  {col.map((item) => (
                    <motion.div 
                      key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} 
                      className="w-full cursor-grab active:cursor-grabbing" draggable={true}
                      onDragStart={(e: any) => {
                        const payload = selectedCards.includes(item.id) && selectedCards.length > 1 ? selectedCards : [item.id];
                        e.dataTransfer.setData("application/json", JSON.stringify(payload));
                        e.dataTransfer.effectAllowed = "move";
                        const emptyImage = document.getElementById("empty-drag-image");
                        if (emptyImage) e.dataTransfer.setDragImage(emptyImage, 0, 0);
                        if (!document.getElementById("drag-cursor-override")) {
                          const styleEl = document.createElement("style"); styleEl.id = "drag-cursor-override"; styleEl.innerHTML = "*, *:before, *:after { cursor: pointer !important; }"; document.head.appendChild(styleEl);
                        }
                        setDraggedItem(item); dragX.set(e.clientX); dragY.set(e.clientY);
                        setTimeout(() => setIsDraggingCard(true), 0);
                      }}
                      onDrag={(e: any) => { if (e.clientX > 0 || e.clientY > 0) { dragX.set(e.clientX); dragY.set(e.clientY); } }}
                      onDragEnd={(e: any) => { setIsDraggingCard(false); setDraggedItem(null); document.getElementById("drag-cursor-override")?.remove(); }}
                    >
                      <BookmarkCard item={item} isSelected={selectedCards.includes(item.id) || contextMenu?.cardId === item.id} viewMode={viewMode} cardSettings={cardSettings} onClick={(e: any) => { e.stopPropagation(); if (contextMenu) { setContextMenu(null); return; } if (selectedCards.length > 0) { if (selectedCards.includes(item.id)) setSelectedCards((prev) => prev.filter((id) => id !== item.id)); else setSelectedCards((prev) => [...prev, item.id]); } else { setSelectedId(item.id); } }} onContextMenu={(e: any) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, cardId: item.id }); setSearchQuery(""); setShowFolderList(false); }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {visibleCount < displayedBookmarks.length && (
            <div ref={loadMoreRef} className="w-full h-20 flex items-center justify-center pt-8 pb-12 opacity-50"><Loader2 className="animate-spin text-zinc-500 w-6 h-6" /></div>
          )}
          {visibleCount >= displayedBookmarks.length && displayedBookmarks.length > 0 && (
            <div className="w-full pb-12 pt-8 text-center text-xs text-zinc-600 font-medium tracking-widest">END OF RESULTS</div>
          )}
        </div>
      </ScrollArea>

      <BookmarkPreview selectedId={selectedId} setSelectedId={setSelectedId} contextMenu={contextMenu} setContextMenu={setContextMenu} similarItems={similarItems} setSimilarItems={setSimilarItems} localMousePos={localMousePos} setLocalMousePos={setLocalMousePos} updateBookmarkField={updateBookmarkField} />

      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            key="context-menu-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.15 }} 
            className="fixed inset-0 z-[90] cursor-default" 
            onPointerDown={(e) => { e.stopPropagation(); setContextMenu(null); setSearchQuery(""); setShowFolderList(false); }} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); setSearchQuery(""); setShowFolderList(false); }} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            key="context-menu-box" 
            id="smart-context-menu" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            transition={{ duration: 0.15 }} 
            style={{ 
              top: menuY, 
              left: menuX,
            }} 
            className="fixed z-[100] w-[300px] rounded-[24px] bg-[#09090b]/98 backdrop-blur-2xl p-4 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-white/5"
          >
            {/* BAGIAN 1: TOMBOL AKSI */}
            <div className="flex flex-col gap-0.5 mb-3">
              {!selectedCards.includes(contextMenu.cardId) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedCards((prev) => [...prev, contextMenu.cardId]); setContextMenu(null); }} 
                  className="w-full text-left px-2 py-0.5 text-[24px] font-normal text-[#a1a1aa] transition-colors hover:text-[#fafafa] bg-transparent outline-none cursor-pointer"
                  style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "0.5px" }}
                >
                  Select
                </button>
              )}

              {!selectedCards.includes(contextMenu.cardId) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); const item = bookmarks.find((b) => b.id === contextMenu.cardId); if (item) copyToClipboardFallback(item.source); setContextMenu(null); }} 
                  className="w-full text-left px-2 py-0.5 text-[24px] font-normal text-[#a1a1aa] transition-colors hover:text-[#fafafa] bg-transparent outline-none cursor-pointer"
                  style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "0.5px" }}
                >
                  Copy
                </button>
              )}

              <button 
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  if (selectedCards.length > 0 && selectedCards.includes(contextMenu.cardId)) { 
                    await supabase.from("bookmarks").delete().in("id", selectedCards); 
                    setBookmarks(bookmarks.filter((b) => !selectedCards.includes(b.id))); 
                    setSelectedCards([]); 
                    setSimilarItems((prev) => prev ? prev.filter((p) => !selectedCards.includes(p.id)) : null); 
                  } else { 
                    await supabase.from("bookmarks").delete().eq("id", contextMenu.cardId); 
                    setBookmarks(bookmarks.filter((b) => b.id !== contextMenu.cardId)); 
                    setSelectedCards((prev) => prev.filter((id) => id !== contextMenu.cardId)); 
                    setSimilarItems((prev) => prev ? prev.filter((p) => p.id !== contextMenu.cardId) : null); 
                  } 
                  setContextMenu(null); 
                }} 
                className="w-full text-left px-2 py-0.5 text-[24px] font-normal text-[#f87171] transition-colors hover:text-[#ef4444] bg-transparent outline-none cursor-pointer"
                style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "0.5px" }}
              >
                {selectedCards.length > 1 && selectedCards.includes(contextMenu.cardId) ? `Delete ${selectedCards.length} Items` : "Delete"}
              </button>
            </div>

            {/* BAGIAN 2: MILARIAN, CATETAN & DAPTAR */}
            <div className="flex flex-col gap-2 w-full relative">

              {/* Kotak Pilarian Koleksi */}
              <div className="bg-[#27272a] rounded-full w-full relative z-20">
                <input 
                  type="text" 
                  placeholder="Search collection..." 
                  value={searchQuery}
                  onFocus={() => setShowFolderList(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!showFolderList) setShowFolderList(true);
                  }}
                  className="w-full bg-transparent border-none outline-none text-[#fafafa] placeholder:text-[#71717a] py-3 px-4 text-[14px] font-sans"
                />
              </div>

              {/* Kotak Catetan */}
              <div className="bg-gradient-to-b from-[#27272a] to-[#09090b] rounded-[18px] w-full relative z-20">
                 {/* MIRROR DIV: untuk mewarnai #tag */}
                 <div
                   aria-hidden="true"
                   className="absolute inset-0 px-4 py-3 text-[14px] font-sans pointer-events-none z-0 overflow-hidden whitespace-pre-wrap break-words leading-relaxed rounded-[18px]"
                 >
                   {noteActiveSuggestion ? (() => {
                     const splitIdx = noteCursorPos - noteActiveSuggestion.typed.length;
                     const before = noteQuery.slice(0, splitIdx);
                     const after = noteQuery.slice(noteCursorPos);
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
                     (noteQuery || "").split(/(#[\w\u00C0-\u024F\u4E00-\u9FFF]+)/g).map((part, i) =>
                       part.match(/^#[\w\u00C0-\u024F\u4E00-\u9FFF]+$/) ? (
                         <span
                           key={i}
                           style={{
                             background: "linear-gradient(90deg, #ffaa40, #9c40ff, #ffaa40)",
                             backgroundSize: "200% auto",
                             WebkitBackgroundClip: "text",
                             WebkitTextFillColor: "transparent",
                             backgroundClip: "text",
                             animation: "gradient 4s linear infinite",
                           }}
                         >
                           {part}
                         </span>
                       ) : (
                         <span key={i} style={{ color: "#a1a1aa" }}>{part}</span>
                       )
                     )
                   )}
                 </div>
                 <textarea
                   ref={noteRef}
                   value={noteQuery}
                   onChange={(e) => setNoteQuery(e.target.value)}
                   onBlur={() => updateBookmarkField(contextMenu.cardId, "note", noteQuery)}
                   onFocus={() => setShowFolderList(false)}
                   onSelect={() => setNoteCursorPos(noteRef.current?.selectionStart ?? 0)}
                   onKeyUp={() => setNoteCursorPos(noteRef.current?.selectionStart ?? 0)}
                   onClick={() => setNoteCursorPos(noteRef.current?.selectionStart ?? 0)}
                   onKeyDown={(e) => {
                     if ((e.key === "Tab" || e.key === "ArrowRight") && noteActiveSuggestion) {
                       e.preventDefault();
                       const before = noteQuery.slice(0, noteCursorPos);
                       const after = noteQuery.slice(noteCursorPos);
                       const newText = before + noteActiveSuggestion.remaining + after;
                       const newPos = noteCursorPos + noteActiveSuggestion.remaining.length;
                       setNoteQuery(newText);
                       setTimeout(() => {
                         noteRef.current?.setSelectionRange(newPos, newPos);
                         setNoteCursorPos(newPos);
                       }, 0);
                     }
                   }}
                   placeholder="Type a note here..."
                   className="w-full bg-transparent border-none outline-none text-transparent caret-[#fafafa] placeholder:text-[#71717a] px-4 py-3 text-[14px] font-sans resize-none h-[70px] leading-relaxed relative z-10"
                 />
              </div>

              {/* Daptar Koleksi Multi-Select (Kaluar mulus di handap) */}
              <AnimatePresence>
                {showFolderList && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -5, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full mt-1 relative"
                  >
                    {/* Efek Gradient Blur Atas */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#09090b] to-transparent z-10 pointer-events-none rounded-t-xl" />

                    <div className="max-h-[175px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5 px-1 py-3 relative z-0">
                      
                      {/* Sistem "Buat Collection Baru" menggunakan onPointerDown agar menu TIDAK tertutup */}
                      {showCreateNew && (
                        <button
                          type="button"
                          onPointerDown={(e) => { 
                            e.preventDefault(); // Mencegah input kehilangan fokus
                            e.stopPropagation(); // Mencegah click bubbling ke background
                            const newName = toTitleCase(queryTrimmed);
                            setTempNewFolders(prev => [...prev, newName]); // Optimistic Ghost Folder
                            addFolder(newName, null); 
                            handleToggleFolder(newName); 
                          }}
                          className="w-full flex items-center justify-between px-1 py-2 text-[14px] font-sans font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors outline-none cursor-pointer bg-transparent"
                        >
                          <span className="truncate">{toTitleCase(queryTrimmed)}</span>
                          <div className="flex-shrink-0 ml-2 flex items-center justify-center text-white">
                            <Plus size={16} strokeWidth={2.5} />
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        onPointerDown={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          handleToggleFolder("Uncategorized"); 
                        }}
                        className="w-full flex items-center justify-between px-1 py-2 text-[14px] font-sans font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors outline-none cursor-pointer bg-transparent"
                      >
                        <span className="truncate">Uncategorized</span>
                        <div className="flex-shrink-0 ml-2 flex items-center justify-center">
                          {activeFolders.includes("Uncategorized") ? (
                            <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                          ) : (
                            <div className="w-3.5 h-3.5 border-[1.5px] border-[#52525b] rounded-full"></div>
                          )}
                        </div>
                      </button>
                      
                      {filteredFolders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onPointerDown={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            handleToggleFolder(f.name); 
                          }}
                          className="w-full flex items-center justify-between px-1 py-2 text-[14px] font-sans font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors outline-none cursor-pointer bg-transparent"
                        >
                          <span className="truncate">{toTitleCase(f.name)}</span>
                          <div className="flex-shrink-0 ml-2 flex items-center justify-center">
                            {activeFolders.includes(f.name) ? (
                              <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                            ) : (
                              <div className="w-3.5 h-3.5 border-[1.5px] border-[#52525b] rounded-full"></div>
                            )}
                          </div>
                        </button>
                      ))}
                      
                      {filteredFolders.length === 0 && !showCreateNew && (
                        <div className="px-1 py-3 text-[13px] font-sans text-zinc-500">
                          No collections found.
                        </div>
                      )}
                    </div>

                    {/* Efek Gradient Blur Bawah */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#09090b] to-transparent z-10 pointer-events-none rounded-b-xl" />
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}