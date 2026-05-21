// Versi: Beta 09 - Supabase & Vector AI + Auto Retry HF (Anti Tidur)
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      url: targetUrl,
      imageUrl,
      title: pageTitle,
      folder,
      colorFeatures,
    } = body;

    if (!targetUrl) {
      return NextResponse.json(
        { error: "URL tidak ditemukan" },
        { status: 400 },
      );
    }

    const rawApiKey = process.env.GROQ_API_KEY;
    if (!rawApiKey)
      return NextResponse.json(
        { error: "API Key Groq tidak ditemukan" },
        { status: 500 },
      );
    const apiKey = rawApiKey.replace(/^['"]|['"]$/g, "").trim();
    const groq = new Groq({ apiKey });

    let isDirectImage = false;
    if (imageUrl && imageUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
      isDirectImage = true;
    }

    let chatCompletion;

    if (isDirectImage) {
      const visionPrompt = `
        Sebagai seorang kurator visual profesional, analisis gambar berikut ini.
        Konteks Web: ${pageTitle || targetUrl}

        TUGAS UTAMA:
        1. Buatlah DESKRIPSI VISUAL yang SANGAT DETAIL.
        2. HANYA deskripsikan apa yang BENAR-BENAR TERLIHAT.
        3. DILARANG menggunakan placeholder. Tuliskan dalam 1 paragraf utuh (3-5 kalimat) berbahasa Indonesia.
        4. Berikan 5-8 kata kunci (tags) bahasa Inggris.

        KEMBALIKAN HANYA OBJEK JSON:
        {
          "tldr": "Deskripsi visual...",
          "tags": ["tag1", "tag2"]
        }
      `;

      try {
        chatCompletion = await groq.chat.completions.create({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPrompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          temperature: 0.2,
        });
      } catch (e) {
        console.log("Vision gagal, pindah ke teks...");
        chatCompletion = null;
      }
    }

    if (!chatCompletion) {
      const textPrompt = `
        Sebagai seorang kurator konten, buatlah ringkasan dari tautan web berikut:
        URL: ${targetUrl}
        Judul: ${pageTitle || "Tidak ada judul"}

        TUGAS UTAMA:
        1. Buatlah ringkasan (TLDR) yang SANGAT DETAIL dalam 1 paragraf utuh berbahasa Indonesia.
        2. ELABORASI konteksnya berdasarkan URL dan Judul.
        3. DILARANG KERAS menggunakan placeholder.
        4. Berikan 5-8 kata kunci (tags) bahasa Inggris.

        KEMBALIKAN HANYA OBJEK JSON:
        {
          "tldr": "Ringkasan konten...",
          "tags": ["tag1", "tag2"]
        }
      `;

      chatCompletion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: textPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
    }

    let text = chatCompletion.choices[0]?.message?.content || "{}";
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");
    if (startIndex !== -1 && endIndex !== -1)
      text = text.substring(startIndex, endIndex + 1);
    const parsedData = JSON.parse(text);

    // =========================================================
    // TAHAP 3A: MEMBUAT VEKTOR DENGAN AUTO-RETRY (Tunggu AI Bangun)
    // =========================================================
    let embedding = null;
    try {
      console.log("Membuat Vektor AI...");
      const hfToken = process.env.HF_TOKEN;
      const headers: any = { "Content-Type": "application/json" };
      if (hfToken) headers["Authorization"] = `Bearer ${hfToken.trim()}`;

      // Kita coba maksimal 5 kali (sekitar 10 detik) sampai AI HF bangun
      for (let i = 0; i < 5; i++) {
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
          {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              inputs: parsedData.tldr || "No description",
            }),
          },
        );

        if (hfResponse.ok) {
          let rawEmbedding = await hfResponse.json();
          if (Array.isArray(rawEmbedding) && Array.isArray(rawEmbedding[0])) {
            embedding = rawEmbedding[0];
          } else {
            embedding = rawEmbedding;
          }
          break; // Sukses dapat angka vektor, keluar dari putaran!
        } else if (hfResponse.status === 503) {
          console.log(
            `[Percobaan ${i + 1}] AI HF sedang loading/tidur, tunggu 2 detik...`,
          );
          await new Promise((res) => setTimeout(res, 2000)); // Tunggu 2 detik sebelum coba lagi
        } else {
          const errText = await hfResponse.text();
          console.error(
            "HuggingFace Error saat save:",
            hfResponse.status,
            errText,
          );
          break; // Error lain, menyerah saja
        }
      }
    } catch (e) {
      console.log("Gagal memanggil fetch vektor:", e);
    }

    // =========================================================
    // TAHAP 3B: MENYIMPAN SEMUANYA KE SUPABASE
    // =========================================================
    const { data: insertedData, error: supabaseError } = await supabase
      .from("bookmarks")
      .insert([
        {
          url: targetUrl,
          title: pageTitle || targetUrl,
          description: parsedData.tldr || "",
          image_url: imageUrl,
          color_h: colorFeatures?.h || 0,
          color_s: colorFeatures?.s || 0,
          color_l: colorFeatures?.l || 50,
          folder: folder || "Uncategorized",
          ai_tags: parsedData.tags || [],
          embedding: embedding,
        },
      ])
      .select()
      .single();

    if (supabaseError) {
      console.error("Supabase Error:", supabaseError);
      return NextResponse.json(
        { error: "Gagal menyimpan ke Supabase: " + supabaseError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ...parsedData, dbData: insertedData },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
