// types/index.ts

export type ViewMode = "moodboard" | "list" | "card" | "timeline";

export type CardSettings = {
  cover: boolean;
  title: boolean;
  description: boolean;
  tags: boolean;
  info: boolean;
};

export type FolderType = {
  id: number;
  name: string;
  colorClass: string;
  parentId: number | null;
  fullPath?: string;
};

export type BookmarkItem = {
  id: number | string;
  title: string;
  source: string;
  image: string;
  tldr: string;
  note?: string; // INI YANG BARU: Tempat menyimpan catatan manual
  tags: string[];
  folder: string;
  colorFeatures: {
    h: number;
    s: number;
    l: number;
    r?: number;
    g?: number;
    b?: number;
  };
  gallery: string[];
  vibeScore?: number;
};