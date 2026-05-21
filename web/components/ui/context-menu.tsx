"use client";

import React, { useEffect, useRef, useState } from "react";
import { Copy, FolderInput, Trash2, CheckSquare, ExternalLink, Search } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

type ContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  onSelect?: () => void;
  onCopy?: () => void;
  onOpenNewTab?: () => void;
  onDelete?: () => void;
  onChangeFolder?: (folderPath: string) => void;
};

export default function ContextMenu({ x, y, onClose, onSelect, onCopy, onOpenNewTab, onDelete, onChangeFolder }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { folders } = useAppContext();
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Pastikan menu tidak keluar dari batas layar browser
  let adjustedX = x;
  let adjustedY = y;
  
  if (typeof window !== "undefined") {
    const menuWidth = 240; 
    const menuHeight = 320; 
    
    if (x + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 10;
    }
  }

  // Filter pencarian folder
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // 1, 2, 3, 4, 8: Class CSS standar untuk semua tombol (16px, soft, no-bold, lega, hover font saja)
  const btnBaseClass = "w-full text-left px-4 py-3 flex items-center gap-4 text-[16px] font-normal text-[#a1a1aa] transition-colors hover:text-[#fafafa] hover:bg-transparent bg-transparent outline-none focus:outline-none";

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[240px] bg-[#18181b] rounded-2xl shadow-2xl py-3 flex flex-col backdrop-blur-2xl bg-opacity-95"
      style={{ top: adjustedY, left: adjustedX, border: "none" }} // 5. Tanpa border
    >
      {/* Tombol Select */}
      {onSelect && (
        <button onClick={() => { onSelect(); onClose(); }} className={btnBaseClass}>
          <CheckSquare size={18} strokeWidth={1.5} />
          <span>Select</span>
        </button>
      )}

      {/* Tombol Copy Link */}
      {onCopy && (
        <button onClick={() => { onCopy(); onClose(); }} className={btnBaseClass}>
          <Copy size={18} strokeWidth={1.5} />
          <span>Copy Link</span>
        </button>
      )}

      {/* Tombol Open in New Tab */}
      {onOpenNewTab && (
        <button onClick={() => { onOpenNewTab(); onClose(); }} className={btnBaseClass}>
          <ExternalLink size={18} strokeWidth={1.5} />
          <span>Open in New Tab</span>
        </button>
      )}

      {/* Tombol Collection (Submenu) */}
      <div 
        className="relative"
        onMouseEnter={() => setShowFolderSubmenu(true)}
        onMouseLeave={() => setShowFolderSubmenu(false)}
      >
        <button className={`${btnBaseClass} justify-between`}>
          <div className="flex items-center gap-4">
            <FolderInput size={18} strokeWidth={1.5} />
            <span>Collection</span> {/* 6. Ubah nama jadi Collection */}
          </div>
          <span className="text-[12px] opacity-50">▶</span>
        </button>

        {/* Submenu Collection List */}
        {showFolderSubmenu && (
          <div 
            className="absolute left-full top-0 ml-2 w-[240px] bg-[#18181b] rounded-2xl shadow-2xl py-3 max-h-[350px] overflow-hidden flex flex-col backdrop-blur-2xl bg-opacity-95"
            style={{ border: "none" }} // 5. Tanpa border
          >
            {/* Input Search Collection */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 bg-[#27272a] rounded-xl px-3 py-2.5 text-[#a1a1aa] focus-within:text-[#fafafa] transition-colors">
                <Search size={16} strokeWidth={1.5} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search collection..." 
                  className="bg-transparent border-none outline-none text-[15px] w-full font-normal placeholder-[#71717a] text-[#fafafa]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* List Collection */}
            <div className="overflow-y-auto custom-scrollbar flex-1 pb-2">
              <button
                onClick={() => { onChangeFolder?.("Uncategorized"); onClose(); }}
                className={btnBaseClass}
              >
                <span>Uncategorized</span>
              </button>
              
              {filteredFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { onChangeFolder?.(f.fullPath || f.name); onClose(); }}
                  className={btnBaseClass}
                >
                  {/* 7. Titik warna dihapus, langsung nama foldernya saja */}
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-[1px] w-full bg-[#27272a] my-2" />

      {/* Tombol Delete */}
      {onDelete && (
        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-4 py-3 flex items-center gap-4 text-[16px] font-normal text-[#f87171] transition-colors hover:text-[#ef4444] hover:bg-transparent bg-transparent outline-none focus:outline-none">
          <Trash2 size={18} strokeWidth={1.5} />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}