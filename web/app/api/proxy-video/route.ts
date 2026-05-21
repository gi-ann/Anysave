// app/api/proxy-video/route.ts
// Proxy server-side untuk bypass CORS dan URL Expired video Instagram/Twitter
import { NextRequest } from "next/server";

export const runtime = "edge"; // edge runtime lebih cepat untuk streaming

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return new Response("URL parameter required", { status: 400 });
  }

  // --- IG URL EXPIRED & ANTI-BOT HANDLER (DIPERKUAT) ---
  // Jika URL adalah URL video IG, kita bersihkan dan ambil mp4 segarnya
  if (
    videoUrl.includes("instagram.com/p/") ||
    videoUrl.includes("instagram.com/reel/")
  ) {
    try {
      // 1. Bersihkan URL dari parameter tracking (igsh, utm_source) yang sering memblokir scraper
      const cleanIgUrl = videoUrl.split("?")[0];
      let foundFreshUrl = "";

      // 2. Mesin Pertama: DDInstagram (Sangat kuat untuk scraping video IG)
      try {
        const ddIgUrl = cleanIgUrl.replace("instagram.com", "ddinstagram.com");
        const ddRes = await fetch(ddIgUrl, {
          // Menyamar sebagai Bot agar Instagram memberikan meta tags video langsung
          headers: { "User-Agent": "TelegramBot (like TwitterBot)" },
        });

        if (ddRes.ok) {
          const ddHtml = await ddRes.text();
          // Cari tag property="og:video" yang menyimpan link mp4 murni
          const match = ddHtml.match(
            /<meta\s+property="og:video"\s+content="([^"]+)"/i,
          );
          if (match && match[1]) {
            // Perbaiki HTML entities (ubah &amp; menjadi &)
            foundFreshUrl = match[1].replace(/&amp;/g, "&");
          }
        }
      } catch (e) {
        console.log("DDInstagram extraction failed", e);
      }

      // 3. Mesin Kedua: Cadangan Microlink (Jika DDInstagram gagal)
      if (!foundFreshUrl) {
        const mlRes = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(cleanIgUrl)}&video=true&audio=true&iframe=false`,
        );
        const mlData = await mlRes.json();
        if (mlData.status === "success" && mlData.data.video?.url) {
          foundFreshUrl = mlData.data.video.url;
        }
      }

      if (foundFreshUrl) {
        videoUrl = foundFreshUrl; // Gunakan URL .mp4 segar ini!
      } else {
        return new Response(
          "Gagal menemukan video segar dari postingan IG ini. Instagram mungkin mengunci postingan.",
          { status: 404 },
        );
      }
    } catch (e) {
      console.log("Gagal merefresh link IG:", e);
    }
  }

  // Whitelist domain yang boleh diproxy (keamanan)
  const allowedDomains = [
    "video.twimg.com",
    "pbs.twimg.com",
    "cdninstagram.com",
    "scontent.cdninstagram.com",
    "instagram.com",
    "fbcdn.net",
    "scontent",
    "microlink.io",
    "ddinstagram.com", // Tambahan izin jika diredirect melalui DDIG
  ];

  let isAllowed = false;
  try {
    const urlObj = new URL(videoUrl!);
    isAllowed = allowedDomains.some(
      (domain) =>
        urlObj.hostname.includes(domain) || urlObj.hostname.endsWith(domain),
    );
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!isAllowed) {
    return new Response("Domain not allowed", { status: 403 });
  }

  try {
    // Tentukan Referer yang tepat sesuai platform
    const isTwitter = videoUrl!.includes("twimg.com");
    const isInstagram =
      videoUrl!.includes("instagram.com") ||
      videoUrl!.includes("cdninstagram.com") ||
      videoUrl!.includes("fbcdn.net");

    const referer = isTwitter
      ? "https://twitter.com/"
      : isInstagram
        ? "https://www.instagram.com/"
        : "https://google.com/";

    const upstreamResponse = await fetch(videoUrl!, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer,
        Origin: isTwitter ? "https://twitter.com" : "https://www.instagram.com",
        Accept: "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "identity", // Jangan compress agar range request works
        "Accept-Language": "en-US,en;q=0.9",
        // Forward Range header untuk video seeking
        ...(request.headers.get("Range")
          ? { Range: request.headers.get("Range")! }
          : {}),
      },
    });

    // Jika Upstream mengembalikan 403 (Forbidden / Signature Expired)
    if (upstreamResponse.status === 403 && isInstagram) {
      console.error("IG Video Signature Expired di dalam Proxy!");
      return new Response(
        "URL Video Instagram Kedaluwarsa. Cobalah hapus kartu dan simpan ulang tautan postingan aslinya.",
        { status: 403 },
      );
    }

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      return new Response(`Upstream error: ${upstreamResponse.status}`, {
        status: upstreamResponse.status,
      });
    }

    const contentType =
      upstreamResponse.headers.get("content-type") || "video/mp4";
    const contentLength = upstreamResponse.headers.get("content-length");
    const contentRange = upstreamResponse.headers.get("content-range");
    const acceptRanges = upstreamResponse.headers.get("accept-ranges");

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Cache-Control": "public, max-age=3600",
      "Cross-Origin-Resource-Policy": "cross-origin",
    };

    if (contentLength) responseHeaders["Content-Length"] = contentLength;
    if (contentRange) responseHeaders["Content-Range"] = contentRange;
    if (acceptRanges) responseHeaders["Accept-Ranges"] = acceptRanges;

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Proxy video error:", error);
    return new Response(`Proxy failed: ${error.message}`, { status: 500 });
  }
}

// Handle preflight CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
