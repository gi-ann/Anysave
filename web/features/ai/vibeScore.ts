// features/ai/vibeScore.ts

// Fungsi untuk menghitung seberapa mirip dua palet warna
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

// Fungsi utama yang mengalkulasi total kemiripan dari AI tags, folder, dan judul
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