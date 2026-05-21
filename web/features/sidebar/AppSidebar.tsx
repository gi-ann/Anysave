"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder as FolderIcon, Plus, ArrowLeft, LogOut } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useSidebar, Sidebar } from "@/features/sidebar/SidebarCore";
import { GradualBlur } from "@/components/ui-assets";
import { toTitleCase } from "@/lib/utils/helpers";
import { FolderType } from "@/types";
import { supabase } from "@/lib/supabase";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (<div className="relative w-full"><table ref={ref} className={`w-full caption-bottom text-sm border-none ${className || ""}`} {...props} /></div>));
Table.displayName = "Table";
export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (<tbody ref={ref} className={`border-none ${className || ""}`} {...props} />));
TableBody.displayName = "TableBody";
export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (<tr ref={ref} className={`transition-colors origin-center border-none ${className || ""}`} {...props} />));
TableRow.displayName = "TableRow";
export const MotionTableRow = motion(TableRow);
export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (<td ref={ref} className={`p-0 align-middle border-none ${className || ""}`} {...props} />));
TableCell.displayName = "TableCell";

export default function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { currentView, setCurrentView, currentFolderId, setCurrentFolderId, folders, bookmarks, addFolder, setFolders, setBookmarks, globalSearchQuery, logout } = useAppContext();
  const [expandedFolders, setExpandedFolders] = useState<number[]>([]);
  
  // State untuk CSV & Drag and Drop Folder
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOverFolderId, setDraggedOverFolderId] = useState<number | string | null>(null);

  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineAddUrl, setInlineAddUrl] = useState("");

  const handleDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(true); 
    } else {
      e.dataTransfer.dropEffect = "move"; 
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => { 
    e.preventDefault(); 
    setIsDragging(false); 
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file || !file.name.toLowerCase().endsWith(".csv")) return;
    
    const text = await file.text();
    const parseCSV = (str: string) => {
      const result = []; let row: string[] = []; let field = ""; let inQuotes = false;
      for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (char === '"') { if (inQuotes && str[i + 1] === '"') { field += '"'; i++; } else { inQuotes = !inQuotes; } }
        else if (char === "," && !inQuotes) { row.push(field); field = ""; }
        else if ((char === "\n" || char === "\r") && !inQuotes) { if (char === "\r" && str[i + 1] === "\n") i++; row.push(field); result.push(row); row = []; field = ""; }
        else { field += char; }
      }
      if (field || row.length > 0) { row.push(field); result.push(row); }
      return result;
    };

    const lines = parseCSV(text).filter((row) => row.length > 1 || row[0].trim() !== "");
    if (lines.length < 2) return;

    const headers = lines[0].map((h: string) => h.toLowerCase().trim().replace(/^"|"$/g, ""));
    const urlKey = headers.find((h: string) => h.includes("url") || h.includes("link")) || "url";
    const titleKey = headers.find((h: string) => h.includes("title") || h.includes("name")) || "title";
    const folderKey = headers.find((h: string) => h.includes("folder") || h.includes("collection")) || "folder";
    const tagsKey = headers.find((h: string) => h.includes("tag")) || "tags";
    const noteKey = headers.find((h: string) => h.includes("note") || h.includes("description") || h.includes("excerpt")) || "note";
    const coverKey = headers.find((h: string) => h.includes("cover") || h.includes("image")) || "cover";

    const parsedData: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]; const obj: any = {};
      headers.forEach((header: string, index: number) => { obj[header] = row[index] ? row[index].replace(/^"|"$/g, "").trim() : ""; });
      if (obj[urlKey]) parsedData.push(obj);
    }

    const colors = ["bg-rose-500", "bg-emerald-500", "bg-purple-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-cyan-500"];
    let currentFolders = [...folders];

    const getOrCreateFolder = (pathStr: string) => {
      if (!pathStr) return null;
      const parts = pathStr.split(/[\/\>]/).map((p) => p.trim()).filter(Boolean);
      let parentId = null; let currentFullPath = "";
      for (const part of parts) {
        currentFullPath = currentFullPath ? `${currentFullPath}/${part}` : part;
        let existing = currentFolders.find((f) => f.fullPath === currentFullPath || (f.name === part && f.parentId === parentId));
        if (!existing) {
          const newFolder = { id: Date.now() + Math.floor(Math.random() * 1000000), name: part, colorClass: colors[Math.floor(Math.random() * colors.length)], parentId: parentId, fullPath: currentFullPath };
          currentFolders.push(newFolder); existing = newFolder;
        }
        parentId = existing.id;
      }
      return currentFullPath;
    };

    const newBookmarks = parsedData.map((item, idx) => {
      let domain = "Link"; try { domain = new URL(item[urlKey]).hostname.replace("www.", ""); } catch (e) {}
      let finalFolderFullPath = ""; if (item[folderKey]) { finalFolderFullPath = getOrCreateFolder(item[folderKey]) || ""; }
      return {
        id: Date.now() + idx, title: item[titleKey] || domain, source: item[urlKey],
        image: item[coverKey] || `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
        tldr: item[noteKey] || "Imported from Raindrop...", tags: item[tagsKey] ? item[tagsKey].split(",").map((t: string) => t.trim()) : [],
        folder: finalFolderFullPath, colorFeatures: { h: 0, s: 0, l: 50, r: 128, g: 128, b: 128 }, gallery: []
      };
    });
    setFolders(currentFolders); setBookmarks((prev) => [...newBookmarks, ...prev]);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverFolderId(null);

    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;

      const cardIds = JSON.parse(data);
      if (!Array.isArray(cardIds) || cardIds.length === 0) return;

      setBookmarks((prev) =>
        prev.map((b) => (cardIds.includes(b.id) ? { ...b, folder: targetFolderPath } : b))
      );

      await supabase
        .from("bookmarks")
        .update({ folder: targetFolderPath })
        .in("id", cardIds);

    } catch (err) {
      console.error("Gagal drag & drop kartu:", err);
    }
  };

  const handleMenuClick = (view: "home" | "folder", folderId: number | null = null) => {
    setCurrentView(view); setCurrentFolderId(folderId);
    if (folderId !== null) { setExpandedFolders((prev) => { if (prev.includes(folderId)) return prev.filter((id) => id !== folderId); return [...prev, folderId]; }); }
    if (isMobile) setOpenMobile(false);
  };

  const renderFolder = (folder: FolderType, depth: number = 0) => {
    const folderBookmarks = bookmarks.filter((b) => {
      if (!b.folder) return false;
      const foldersArray = b.folder.split(",").map((f) => f.trim());
      return foldersArray.includes(folder.fullPath || "") || foldersArray.includes(folder.name);
    });
    const itemCount = folderBookmarks.length; 
    const isActive = currentView === "folder" && currentFolderId === folder.id;
    const isDraggedOver = draggedOverFolderId === folder.id;
    const isExpanded = expandedFolders.includes(folder.id); 
    const children = folders.filter((f) => f.parentId === folder.id);
    const fontSize = depth === 0 ? "22px" : depth === 1 ? "16px" : "14px";
    
    const textColorClass = isActive || isDraggedOver ? "text-white" : "text-[#9f9fa9] group-hover/row:text-white";

    return (
      <React.Fragment key={folder.id}>
        <MotionTableRow 
          initial={depth > 0 ? { opacity: 0, y: -10 } : false} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }} 
          transition={{ duration: 0.2 }} 
          className="group/row cursor-pointer relative border-none" 
          onClick={(e: any) => { e.stopPropagation(); handleMenuClick("folder", folder.id); }}
          onDragOver={(e: any) => {
            e.preventDefault(); e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            if (!e.dataTransfer.types.includes("Files")) setDraggedOverFolderId(folder.id);
          }}
          onDragLeave={(e: any) => {
            e.preventDefault(); e.stopPropagation();
            setDraggedOverFolderId(null);
          }}
          onDrop={(e: any) => handleFolderDrop(e, folder.fullPath || folder.name)}
        >
          <TableCell className="py-3 pl-4 border-none">
            <span className={`transition-colors duration-300 font-[400] ${textColorClass}`} style={{ fontSize: fontSize, fontFamily: "'Instrument Serif', serif" }}>
              {toTitleCase(folder.name)}
            </span>
          </TableCell>
          <TableCell className="text-right py-3 pr-4 border-none">
            <span className={`transition-colors duration-300 font-[400] ${textColorClass}`} style={{ fontSize: fontSize, fontFamily: "'Instrument Serif', serif" }}>
              {itemCount}
            </span>
          </TableCell>
        </MotionTableRow>
        <AnimatePresence>{isExpanded && children.length > 0 && children.map((child) => renderFolder(child, depth + 1))}</AnimatePresence>
      </React.Fragment>
    );
  };

  const displayedFoldersInSidebar = folders.filter((f) => {
    if (globalSearchQuery.trim()) { const searchWords = globalSearchQuery.toLowerCase().split(" ").filter((w) => w.trim().length > 0); return searchWords.every((word) => f.name.toLowerCase().includes(word)); }
    return f.parentId === null;
  });

  return (
    <Sidebar>
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-transparent">
        
        {/* BLUR HEADER (Bisa diklik untuk scroll ke atas) */}
        <div 
          className="absolute top-0 left-0 right-0 z-40 cursor-pointer" 
          style={{ height: "6rem" }}
          title="Scroll ke Atas"
          onClick={(e) => { 
            e.stopPropagation(); 
            document.getElementById("sidebar-scroll-container")?.scrollTo({ top: 0, behavior: "smooth" }); 
          }}
        >
          <GradualBlur position="top" height="6rem" strength={3} divCount={5} curve="bezier" />
        </div>
        
        {/* KONTAINER UTAMA (Edge-to-Edge Scroll) */}
        <div id="sidebar-scroll-container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar px-6 pt-24 pb-32 flex flex-col">
          
          {isDragging && (<div className="fixed inset-4 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md border-2 border-dashed border-zinc-500 rounded-2xl transition-all duration-300 pointer-events-none"><div className="text-center"><FolderIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" /><p className="text-zinc-100 font-semibold text-xl mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>Drop CSV here</p><p className="text-zinc-500 text-sm" style={{ fontFamily: "'Instrument Serif', serif" }}>to import all Raindrop bookmarks</p></div></div>)}
          
          {/* JUDUL OMNIFI */}
          <div className="mb-12 flex justify-start w-full">
             <h1 className="leading-[0.9] text-white font-normal w-full" style={{ fontSize: "6.8rem", fontFamily: "'Instrument Serif Italic', serif", fontFeatureSettings: '"liga" 1, "dlig" 1' }}>Omnifi</h1>
          </div>
          
          <Table className="w-full border-none">
            <TableBody className="border-none">
              
              {/* MENU ALL BOOKMARKS */}
              <TableRow 
                className="group/row cursor-pointer border-none" 
                onClick={() => handleMenuClick("home")}
                onDragOver={(e: any) => {
                  e.preventDefault(); e.stopPropagation();
                  e.dataTransfer.dropEffect = "move"; 
                  if (!e.dataTransfer.types.includes("Files")) setDraggedOverFolderId("home");
                }}
                onDragLeave={(e: any) => {
                  e.preventDefault(); e.stopPropagation();
                  setDraggedOverFolderId(null);
                }}
                onDrop={(e: any) => handleFolderDrop(e, "Uncategorized")}
              >
                <TableCell className="py-3 pl-4 border-none">
                  <span className={`transition-colors duration-300 font-[400] ${currentView === "home" || draggedOverFolderId === "home" ? "text-white" : "text-[#9f9fa9] group-hover/row:text-white"}`} style={{ fontSize: "22px", fontFamily: "'Instrument Serif', serif" }}>
                    All Bookmarks
                  </span>
                </TableCell>
                <TableCell className="text-right py-3 pr-4 border-none">
                  <span className={`transition-colors duration-300 font-[400] ${currentView === "home" || draggedOverFolderId === "home" ? "text-white" : "text-[#9f9fa9] group-hover/row:text-white"}`} style={{ fontSize: "22px", fontFamily: "'Instrument Serif', serif" }}>
                    {bookmarks.length}
                  </span>
                </TableCell>
              </TableRow>
              
              {/* SPACER */}
              <TableRow className="border-none"><TableCell colSpan={2} className="h-4 border-none" /></TableRow>
              
              {/* LIST COLLECTION / FOLDERS */}
              {displayedFoldersInSidebar.map((folder) => renderFolder(folder, 0))}
              
              {/* MENU NEW FOLDER */}
              <TableRow className="border-none">
                <TableCell colSpan={2} className="border-none pt-2">
                  <AnimatePresence mode="wait">
                    {!isInlineAdding ? (
                      <motion.div key="add-button" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} whileHover="hover" onClick={(e: any) => { e.stopPropagation(); setIsInlineAdding(true); }} className="flex items-center gap-3 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-colors select-none group/add pl-4">
                        <Plus size={18} className="transition-transform group-hover/add:scale-110" />
                        <span style={{ fontSize: "22px", fontFamily: "'Instrument Serif', serif" }}>New Folder</span>
                      </motion.div>
                    ) : (
                      <motion.div key="add-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="w-[calc(100%-1rem)] rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col relative shadow-2xl mt-2 ml-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase mb-3">New Folder</span>
                        <input autoFocus value={inlineAddUrl} onChange={(e) => setInlineAddUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (inlineAddUrl.trim()) { addFolder(inlineAddUrl.trim(), null); setIsInlineAdding(false); setInlineAddUrl(""); } } else if (e.key === "Escape") { setIsInlineAdding(false); setInlineAddUrl(""); } }} placeholder="Name..." className="bg-transparent text-sm text-white outline-none w-full mb-4 border-b border-zinc-700 pb-1 focus:border-zinc-400 transition-colors font-sans" />
                        <div className="flex justify-between items-center mt-auto"><ArrowLeft onClick={() => { setIsInlineAdding(false); setInlineAddUrl(""); }} className="text-zinc-400 hover:text-white cursor-pointer transition-transform hover:-translate-x-1" size={16} /><button onClick={() => { if (inlineAddUrl.trim()) { addFolder(inlineAddUrl.trim(), null); setIsInlineAdding(false); setInlineAddUrl(""); } }} className="bg-white text-black px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-zinc-200 transition-colors">Create</button></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TableCell>
              </TableRow>

              {/* MENU LOGOUT (Tepat di bawah New Folder) */}
              <TableRow className="border-none">
                <TableCell colSpan={2} className="border-none pt-1">
                  <motion.div 
                    whileHover="hover" 
                    onClick={() => logout()} 
                    className="flex items-center gap-3 py-2 text-sm font-medium text-[#9f9fa9] hover:text-[#ef4444] rounded-lg cursor-pointer transition-colors select-none group/logout pl-4"
                  >
                    <LogOut size={18} className="transition-transform group-hover/logout:-translate-x-1" />
                    <span style={{ fontSize: "22px", fontFamily: "'Instrument Serif', serif" }}>Logout Account</span>
                  </motion.div>
                </TableCell>
              </TableRow>

            </TableBody>
          </Table>

        </div>

        {/* BLUR FOOTER (Bisa diklik untuk scroll ke bawah) */}
        <div 
          className="absolute bottom-0 left-0 right-0 z-40 cursor-pointer" 
          style={{ height: "6rem" }}
          title="Scroll ke Bawah"
          onClick={(e) => { 
            e.stopPropagation(); 
            const el = document.getElementById("sidebar-scroll-container"); 
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); 
          }}
        >
          <GradualBlur position="bottom" height="6rem" strength={3} divCount={5} curve="bezier" exponential />
        </div>
      </div>
    </Sidebar>
  );
}