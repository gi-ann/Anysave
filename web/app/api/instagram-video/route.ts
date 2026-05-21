import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Strategy 1: Cobalt API (Paling reliable) ------------------------
async function getVideoViaCobalt(url: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        url,
        videoQuality: "1080",
        filenameStyle: "basic",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn("[Cobalt] Status:", res.status);
      return null;
    }

    const data = await res.json();
    console.log("[Cobalt] Response status:", data.status);

    // Direct video URL
    if (data.status === "stream" || data.status === "redirect") {
      return data.url ?? null;
    }

    // Multiple media (carousel/reel dengan audio terpisah)
    if (data.status === "picker" && Array.isArray(data.picker)) {
      const videoItem = data.picker.find((item: any) => item.type === "video");
      return videoItem?.url ?? data.picker[0]?.url ?? null;
    }

    // Tunnel stream dari cobalt sendiri
    if (data.status === "tunnel" && data.url) {
      return data.url;
    }

    return null;
  } catch (err) {
    console.error("[Cobalt] Error:", err);
    return null;
  }
}

// --- Strategy 2: Scrape halaman Instagram langsung -------------------
async function getVideoViaScrape(url: string): Promise<string | null> {
  try {
    // Normalize URL - hapus query params tracking
    const cleanUrl = url.split("?")[0];

    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Cari video URL di JSON-LD atau meta tags
    const patterns = [
      /"video_url":"([^"]+)"/,
      /"contentUrl":"([^"]+)"/,
      /<meta property="og:video" content="([^"]+)"/,
      /<meta property="og:video:secure_url" content="([^"]+)"/,
      /"playback_url":"([^"]+)"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        // Unescape unicode escapes dari JSON
        return match[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      }
    }

    return null;
  } catch (err) {
    console.error("[Scrape] Error:", err);
    return null;
  }
}

// --- Strategy 3: oEmbed + microlink ----------------------------------
async function getVideoViaMicrolink(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&video=true&meta=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();

    if (data.status === "success" && data.data?.video?.url) {
      return data.data.video.url;
    }
    return null;
  } catch (err) {
    console.error("[Microlink] Error:", err);
    return null;
  }
}

// --- Main Handler ----------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
    }

    console.log("[Instagram Video] Mencoba URL:", url);

    // Coba satu per satu sampai berhasil
    const strategies = [
      { name: "Cobalt", fn: () => getVideoViaCobalt(url) },
      { name: "Scrape", fn: () => getVideoViaScrape(url) },
      { name: "Microlink", fn: () => getVideoViaMicrolink(url) },
    ];

    for (const strategy of strategies) {
      console.log(`[Instagram Video] Mencoba strategy: ${strategy.name}`);
      const videoUrl = await strategy.fn();

      if (videoUrl) {
        console.log(`[Instagram Video] Berhasil via ${strategy.name}`);
        // KEMBALIKAN RAW URL! Nanti di Frontend dibungkus dengan helper getProxiedVideoUrl
        return NextResponse.json({ videoUrl, source: strategy.name });
      }
    }

    console.warn("[Instagram Video] Semua strategy gagal");
    return NextResponse.json({ videoUrl: null, error: "Video tidak dapat diekstrak" }, { status: 404 });

  } catch (err) {
    console.error("[Instagram Video] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}