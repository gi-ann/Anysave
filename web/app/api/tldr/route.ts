// Versi: Beta 30 - Fix Note Saving
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js"; 

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url: targetUrl, imageUrl, title: pageTitle, folder, colorFeatures, gallery, email, password, note } = body; 

    if (!targetUrl) {
      return NextResponse.json({ error: "URL tidak ditemukan" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    let userSupabase = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get("Authorization");

    if (authHeader && authHeader.length > 10) {
        userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });
    } 
    else if (email && password) {
        const { data: authData, error: authError } = await userSupabase.auth.signInWithPassword({ email, password });
        if (authError || !authData.session) {
            return NextResponse.json({ error: "Akses Ditolak: Email/Password di Ekstensi salah." }, { status: 401 });
        }
        userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
        });
    } else {
        return NextResponse.json({ error: "Akses Ditolak: RLS memblokir aksi ini karena kamu belum login." }, { status: 401 });
    }

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const rawApiKey = process.env.GROQ_API_KEY;
    if (!rawApiKey) return NextResponse.json({ error: "API Key Groq tidak ditemukan" }, { status: 500 });
    const apiKey = rawApiKey.replace(/^['"]|['"]$/g, '').trim();
    const groq = new Groq({ apiKey });

    let enhancedTitle = pageTitle || targetUrl;
    try {
      if (targetUrl.includes('x.com') || targetUrl.includes('twitter.com')) {
        const urlObj = new URL(targetUrl);
        const vxUrl = `https://api.vxtwitter.com${urlObj.pathname}`;
        const vxRes = await fetch(vxUrl);
        if (vxRes.ok) {
            const vxData = await vxRes.json();
            if (vxData && vxData.text) enhancedTitle = `[Teks Postingan Asli]: "${vxData.text}"`;
        }
      }
    } catch (e) {
      console.log("Gagal fetch teks sosmed di backend:", e);
    }

    const imagesToAnalyze = (gallery && gallery.length > 0) ? gallery.slice(0, 4) : [imageUrl];
    const validImages = imagesToAnalyze.filter(
      (img: string) => {
          if (!img || !img.startsWith('http')) return false;
          if (img.includes('favicons?domain=')) return false;
          if (img.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) return false;
          return true;
      }
    );

    if (validImages.length === 0 && imageUrl && !imageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
       validImages.push(imageUrl);
    }

    let isDirectImage = validImages.length > 0;
    let chatCompletion;
    let visionErrorMessage = "";

    if (isDirectImage) {
      const visionPrompt = `
        KAMU ADALAH SEORANG PAKAR FILM, BUDAYA POP, DESAINER, SEKALIGUS ANALIS VISUAL TINGKAT TINGGI.
        TUGAS UTAMA: Gabungkan PENGETAHUAN DUNIAMU dan TEKS POSTINGAN ASLI dengan ANALISIS VISUAL YANG SANGAT DETAIL dari gambar-gambar berikut.
        Informasi Teks Posting: ${enhancedTitle}

        ATURAN WAJIB (HARUS DIIKUTI ATAU GAGAL):
        1. KELUARKAN HANYA FORMAT JSON MURNI. PASTIKAN MENGGUNAKAN "\\n\\n" UNTUK PINDAH BARIS DI DALAM JSON STRING.
        2. Isi dari "tldr" WAJIB terdiri dari persis 3 PARAGRAF yang mendetail:
           - PARAGRAF 1 (PEMBACAAN POSTINGAN, KONTEKS KARYA & MEDIUM): BACA DAN PAHAMI isi 'Informasi Teks Posting'. Identifikasi adegan di gambar (Sebutkan Judul Film/Karya, Aktor/Karakter). Hubungkan dengan teks postingan.
           - PARAGRAF 2 (OBJEK & MANUSIA): Deskripsi visual SANGAT DETAIL tentang manusia/karakter utama (pakaian, ekspresi, aktivitas).
           - PARAGRAF 3 (LINGKUNGAN & DESAIN): Deskripsi lingkungan sekitar SANGAT DETAIL (suasana ruangan, benda spesifik, teks/tipografi di gambar).
        3. Berikan 10-15 "tags" bahasa Inggris. Wajib masukkan nama film/aktor yang akurat jika dikenali. JIKA ada elemen desain/teks di gambar, WAJIB masukkan tag seperti "poster", "graphic design", "typography".

        CONTOH OUTPUT JSON YANG BENAR:
        {
          "tldr": "Paragraf 1...\\n\\nParagraf 2...\\n\\nParagraf 3...",
          "tags": ["tag1", "tag2"]
        }
      `;

      const messageContentUrl: any[] = [{ type: "text", text: visionPrompt }];
      validImages.forEach((img: string) => {
        messageContentUrl.push({ type: "image_url", image_url: { url: img } });
      });

      try {
        chatCompletion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct", 
          messages: [{ role: "user", content: messageContentUrl }],
          temperature: 0.3, max_tokens: 2048, 
        });
      } catch (e1: any) {
        try {
            const messageContentBase64: any[] = [{ type: "text", text: visionPrompt }];
            const fallbackImage = validImages[0];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const imgResponse = await fetch(fallbackImage, {
                headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (imgResponse.ok) {
                const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                if (contentType.includes('video')) throw new Error("URL berisi video.");
                const arrayBuffer = await imgResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Url = `data:${contentType};base64,${buffer.toString('base64')}`;
                messageContentBase64.push({ type: "image_url", image_url: { url: base64Url } });
            } else { throw new Error("Gagal mengunduh gambar fallback."); }
            
            chatCompletion = await groq.chat.completions.create({
              model: "meta-llama/llama-4-scout-17b-16e-instruct", 
              messages: [{ role: "user", content: messageContentBase64 }],
              temperature: 0.3, max_tokens: 2048,
            });
        } catch (e2: any) { visionErrorMessage = `${e1.message} | ${e2.message}`; chatCompletion = null; }
      }
    }

    if (isDirectImage && !chatCompletion) {
        chatCompletion = { choices: [{ message: { content: JSON.stringify({ tldr: `[ERROR AI VISION] Detail: ${visionErrorMessage}`, tags: ["error"] }) } }] };
    } else if (!chatCompletion) {
      const textPrompt = `
        KAMU ADALAH PAKAR FILM DAN BUDAYA POP. Buat ringkasan berdasarkan info berikut.
        URL: ${targetUrl}
        Informasi Teks Posting: ${enhancedTitle}

        TUGAS WAJIB: KELUARKAN HANYA FORMAT JSON MURNI! (2 Paragraf tldr & 5-8 tags bahasa Inggris)
      `;
      chatCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: textPrompt }],
        response_format: { type: "json_object" }, temperature: 0.3,
      });
    }

    let parsedData = { tldr: "Sedang menganalisis...", tags: ["analyzing"] };
    try {
        let text = chatCompletion.choices[0]?.message?.content || "{}";
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) text = text.substring(startIndex, endIndex + 1);
        parsedData = JSON.parse(text);
    } catch (parseError) {
        const rawContent = chatCompletion.choices[0]?.message?.content || "";
        let safeText = rawContent.replace(/["'{}\[\]]/g, '').trim();
        parsedData = { tldr: safeText.length > 20 ? safeText.substring(0, 500) + "..." : "Format error.", tags: ["format-error"] };
    }

    let embedding = null;
    try {
       const hfToken = process.env.HF_TOKEN; 
       const headers: any = { "Content-Type": "application/json" };
       if (hfToken) headers["Authorization"] = `Bearer ${hfToken.trim()}`;
       for (let i = 0; i < 5; i++) {
           const hfResponse = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
               method: "POST", headers: headers, body: JSON.stringify({ inputs: parsedData.tldr || "No description" })
           });
           if (hfResponse.ok) {
               let rawEmbedding = await hfResponse.json();
               embedding = (Array.isArray(rawEmbedding) && Array.isArray(rawEmbedding[0])) ? rawEmbedding[0] : rawEmbedding;
               break; 
           } else if (hfResponse.status === 503) { await new Promise(res => setTimeout(res, 2000)); } 
           else { break; }
       }
    } catch (e) {}

    let insertedData = null;
    let supabaseError = null;

    const safeImageUrl = (imageUrl && imageUrl.length > 500000) ? 'https://via.placeholder.com/400?text=Image+Too+Large' : imageUrl;
    const safeGallery = gallery ? gallery.map((url: string) => (url.length > 500000) ? safeImageUrl : url) : [];

    for (let i = 0; i < 3; i++) {
        try {
            const result = await userSupabase
              .from('bookmarks')
              .insert([{
                  url: targetUrl,
                  title: pageTitle || targetUrl,
                  description: parsedData.tldr || "",
                  image_url: safeImageUrl,
                  color_h: colorFeatures?.h || 0,
                  color_s: colorFeatures?.s || 0,
                  color_l: colorFeatures?.l || 50,
                  folder: folder || 'Uncategorized',
                  note: note || "", // FIX 4: MENYIMPAN CATATAN EKTENSI KE DB!
                  ai_tags: parsedData.tags || [],
                  embedding: embedding,
                  gallery: safeGallery,
                  user_id: user.id 
              }])
              .select()
              .single();

            if (result.error) {
                supabaseError = result.error;
                if (result.error.message.includes("fetch failed") || result.error.message.includes("network") || result.error.message.includes("timeout")) {
                    await new Promise(res => setTimeout(res, 2000));
                    continue;
                } else { break; }
            } else {
                insertedData = result.data;
                supabaseError = null;
                break;
            }
        } catch (err: any) {
            supabaseError = { message: err.message || "Unknown error" };
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    if (supabaseError) {
      console.error("Supabase Error Final:", supabaseError);
      return NextResponse.json({ error: "Gagal menyimpan ke Supabase: " + supabaseError.message }, { status: 500 });
    }

    return NextResponse.json({ ...parsedData, dbData: insertedData }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}