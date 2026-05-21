"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FolderType, ViewMode, CardSettings, BookmarkItem } from "@/types";
import { User } from "@supabase/supabase-js";

type AppContextType = {
  user: User | null;
  isAuthChecking: boolean;
  logout: () => Promise<void>;
  currentView: "home" | "folder";
  setCurrentView: (view: "home" | "folder") => void;
  currentFolderId: number | null;
  setCurrentFolderId: (id: number | null) => void;
  colCount: number;
  setColCount: (count: number) => void;
  folders: FolderType[];
  addFolder: (name: string, parentId?: number | null) => void;
  updateFolderName: (id: number, newName: string) => void;
  deleteFolder: (id: number) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  cardSettings: CardSettings;
  setCardSettings: React.Dispatch<React.SetStateAction<CardSettings>>;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  bookmarks: BookmarkItem[];
  setBookmarks: React.Dispatch<React.SetStateAction<BookmarkItem[]>>;
  addingFolderId: number | null | "root";
  setAddingFolderId: React.Dispatch<React.SetStateAction<number | null | "root">>;
  setFolders: React.Dispatch<React.SetStateAction<FolderType[]>>;
  isSearchingSemantic: boolean;
  semanticResults: any[];
};

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [currentView, setCurrentView] = useState<"home" | "folder">("home");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [colCount, setColCount] = useState(5);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [addingFolderId, setAddingFolderId] = useState<number | null | "root">(null);
  const [viewMode, setViewMode] = useState<ViewMode>("moodboard");
  const [cardSettings, setCardSettings] = useState<CardSettings>({ cover: true, title: true, description: false, tags: false, info: true });
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setFolders([]);
      return;
    }

    const fetchData = async () => {
      const savedFolders = localStorage.getItem(`anysave_folders_${user.id}`);
      if (savedFolders) setFolders(JSON.parse(savedFolders));

      const { data, error } = await supabase.from("bookmarks").select("*").order("created_at", { ascending: false });
      if (data) {
        const formattedBookmarks = data.map((d: any) => ({
          id: d.id, 
          title: d.title, 
          source: d.url, 
          image: d.image_url, 
          tldr: d.description, 
          note: d.note,
          tags: d.ai_tags, 
          folder: d.folder, 
          colorFeatures: { h: d.color_h, s: d.color_s, l: d.color_l }, 
          gallery: d.gallery || [],
        }));
        setBookmarks(formattedBookmarks);

        const dbFolders = new Set<string>();
        data.forEach(d => {
          if (d.folder) {
            d.folder.split(",").forEach((f: string) => dbFolders.add(f.trim()));
          }
        });

        setFolders(prev => {
          let newFolders = [...prev];
          const colors = ["bg-rose-500", "bg-emerald-500", "bg-purple-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-cyan-500"];
          
          dbFolders.forEach(folderName => {
            if (folderName && folderName !== "Uncategorized" && !newFolders.find(f => f.name === folderName)) {
              newFolders.push({
                id: Date.now() + Math.floor(Math.random() * 1000000),
                name: folderName,
                colorClass: colors[Math.floor(Math.random() * colors.length)],
                parentId: null,
                fullPath: folderName
              });
            }
          });
          return newFolders;
        });

      } else if (error) console.error("Gagal menarik data dari Supabase:", error);
      setIsLoaded(true);
    };
    fetchData();
  }, [user]);

  useEffect(() => { 
    if (isLoaded && user) {
      localStorage.setItem(`anysave_folders_${user.id}`, JSON.stringify(folders)); 
      
      // FIX PENTING: Sync Folder Kosong ke Metadata Profil User
      // Agar Ekstensi Chrome bisa membaca folder yang belum ada isinya!
      const folderNames = folders.map(f => f.fullPath || f.name);
      supabase.auth.updateUser({
        data: { anysave_folders: folderNames }
      });
    }
  }, [folders, isLoaded, user]);

  useEffect(() => {
    if (!globalSearchQuery.trim()) { setSemanticResults([]); setIsSearchingSemantic(false); return; }
    setIsSearchingSemantic(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/embed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: globalSearchQuery }) });
        if (response.ok) {
          const { embedding } = await response.json();
          const { data } = await supabase.rpc("match_bookmarks", { query_embedding: embedding, match_threshold: 0.25, match_count: 30 });
          if (data) setSemanticResults(data);
        }
      } catch (err) { console.error("Gagal semantic search", err); } finally { setIsSearchingSemantic(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  const addFolder = (name: string, parentId: number | null = null) => {
    const colors = ["bg-rose-500", "bg-emerald-500", "bg-purple-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-cyan-500"];
    let fullPath = name;
    if (parentId !== null) {
      const parent = folders.find((f) => f.id === parentId);
      if (parent && parent.fullPath) fullPath = `${parent.fullPath}/${name}`; else if (parent) fullPath = `${parent.name}/${name}`;
    }
    setFolders([...folders, { id: Date.now(), name, colorClass: colors[Math.floor(Math.random() * colors.length)], parentId, fullPath }]);
  };

  const updateFolderName = (id: number, newName: string) => {
    if (!newName.trim()) return;
    const folderToUpdate = folders.find((f) => f.id === id);
    if (!folderToUpdate) return;
    const oldName = folderToUpdate.name; const oldFullPath = folderToUpdate.fullPath || folderToUpdate.name;
    let newFullPath = "";
    if (oldFullPath === oldName) newFullPath = newName; else if (oldFullPath.endsWith("/" + oldName)) newFullPath = oldFullPath.slice(0, oldFullPath.lastIndexOf("/" + oldName)) + "/" + newName; else newFullPath = newName;

    setFolders((prevFolders) => {
      const updatePaths = (foldersList: FolderType[], parentOldPath: string, parentNewPath: string) => {
        return foldersList.map((f) => {
          if (f.id === id) return { ...f, name: newName, fullPath: newFullPath };
          if (f.fullPath && f.fullPath.startsWith(parentOldPath + "/")) { const childNewPath = f.fullPath.replace(parentOldPath, parentNewPath); return { ...f, fullPath: childNewPath }; }
          return f;
        });
      };
      return updatePaths(prevFolders, oldFullPath, newFullPath);
    });

    setBookmarks((prevBookmarks) => prevBookmarks.map((b) => {
      if (b.folder === oldFullPath || b.folder === oldName) return { ...b, folder: newFullPath };
      if (b.folder && b.folder.startsWith(oldFullPath + "/")) return { ...b, folder: b.folder.replace(oldFullPath, newFullPath) };
      return b;
    }));
  };

  const deleteFolder = (id: number) => {
    setFolders((prev) => prev.filter((f) => f.id !== id && f.parentId !== id));
    if (currentFolderId === id) { setCurrentView("home"); setCurrentFolderId(null); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AppContext.Provider value={{ user, isAuthChecking, logout, currentView, setCurrentView, currentFolderId, setCurrentFolderId, colCount, setColCount, folders, addFolder, updateFolderName, deleteFolder, viewMode, setViewMode, cardSettings, setCardSettings, globalSearchQuery, setGlobalSearchQuery, bookmarks, setBookmarks, addingFolderId, setAddingFolderId, setFolders, isSearchingSemantic, semanticResults }}>
      {children}
    </AppContext.Provider>
  );
}