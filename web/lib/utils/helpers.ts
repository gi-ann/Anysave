// lib/utils/helpers.ts

export const copyToClipboardFallback = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  };
  
  // --- Fungsi Helper getProxiedVideoUrl ---
  export function getProxiedVideoUrl(url: string | null | undefined): string {
    if (!url) return "";
    
    // Jika sudah melalui proxy kita, jangan double-proxy
    if (url.startsWith("/api/proxy-video")) return url;
    
    // URL lokal tidak perlu proxy
    if (url.startsWith("/") || url.startsWith("blob:")) return url;
    
    // SOLUSI CLAUDE: Proxy semua URL video eksternal agar aman dari pemblokiran CORS browser
    return `/api/proxy-video?url=${encodeURIComponent(url)}`;
  }
  
  // --- Fungsi Deteksi URL Instagram ---
  export const isInstagramUrl = (url: string) => {
    return url && (url.includes("instagram.com") || url.includes("instagr.am"));
  };
  
  export function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }
  
  export const extractImageFeatures = (
    imageUrl: string,
  ): Promise<{
    h: number;
    s: number;
    l: number;
    r: number;
    g: number;
    b: number;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ h: 0, s: 0, l: 50, r: 128, g: 128, b: 128 });
          return;
        }
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        try {
          const imageData = ctx.getImageData(0, 0, 64, 64).data;
          let rSum = 0,
            gSum = 0,
            bSum = 0;
          const pixelCount = imageData.length / 4;
          for (let i = 0; i < imageData.length; i += 4) {
            rSum += imageData[i];
            gSum += imageData[i + 1];
            bSum += imageData[i + 2];
          }
          const r = Math.round(rSum / pixelCount);
          const g = Math.round(gSum / pixelCount);
          const b = Math.round(bSum / pixelCount);
          const [h, s, l] = rgbToHsl(r, g, b);
          resolve({ h, s, l, r, g, b });
        } catch (e) {
          resolve({ h: 0, s: 0, l: 50, r: 128, g: 128, b: 128 });
        }
      };
      img.onerror = () => resolve({ h: 0, s: 0, l: 50, r: 128, g: 128, b: 128 });
      img.src = imageUrl;
    });
  };
  
  export const calculateVibeDistance = (c1: any, c2: any) => {
    if (!c1 || !c2 || c1.h === undefined || c2.h === undefined) return Infinity;
    const hueDiffRaw = Math.abs(c1.h - c2.h);
    const hDiff = Math.min(hueDiffRaw, 360 - hueDiffRaw) / 180;
    return (
      hDiff * 0.6 +
      (Math.abs(c1.l - c2.l) / 100) * 0.25 +
      (Math.abs(c1.s - c2.s) / 100) * 0.15
    );
  };
  
  // =======================================================================
  // SISTEM SCORING "SAME VIBES"
  // =======================================================================
  export const getVibeScore = (item1: any, item2: any) => {
    let score = 0;
  
    // 1. Tag Match (Super strong signal)
    if (item1.tags && item2.tags) {
      const overlap = item1.tags.filter((t: string) =>
        item2.tags.includes(t),
      ).length;
      score += overlap * 5;
    }
  
    // 2. Folder Match (Strong signal)
    if (
      item1.folder &&
      item1.folder === item2.folder &&
      item1.folder !== "Uncategorized"
    ) {
      score += 3;
    }
  
    // 3. Color Match (Visual signal pendukung)
    if (item1.colorFeatures && item2.colorFeatures) {
      const colorDist = calculateVibeDistance(
        item1.colorFeatures,
        item2.colorFeatures,
      );
      if (colorDist < 0.05) score += 4;
      else if (colorDist < 0.1) score += 2;
      else if (colorDist < 0.18) score += 1;
    }
  
    // 4. Title / Text Match
    if (item1.title && item2.title) {
      const words1 = item1.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 3);
      const words2 = item2.title.toLowerCase();
      const textOverlap = words1.filter((w: string) => words2.includes(w)).length;
      score += textOverlap * 2;
    }
  
    return score;
  };
  
  export const toTitleCase = (str: string) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };