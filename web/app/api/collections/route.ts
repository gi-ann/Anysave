import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    let userSupabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Verifikasi KTP (Login) dari Ekstensi
    if (email && password) {
        const { data: authData, error: authError } = await userSupabase.auth.signInWithPassword({ email, password });
        if (authError || !authData.session) return NextResponse.json({ error: "Akses Ditolak" }, { status: 401 });
        
        userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
        });
    } else {
        return NextResponse.json({ error: "Missing credentials" }, { status: 401 });
    }

    // Ambil data User untuk membaca folder kosong yang disinkronisasi di profil
    const { data: { user } } = await userSupabase.auth.getUser();
    const metaFolders = user?.user_metadata?.anysave_folders || [];

    // 2. Ambil folder dari bookmark yang sudah ada isinya
    const { data, error } = await userSupabase.from('bookmarks').select('folder');
    if (error) throw error;

    // 3. Buang nama folder yang duplikat (menggunakan Set)
    const folderSet = new Set<string>();
    
    // MASUKKAN FOLDER KOSONG DARI WEB (Dari metadata profil)
    if (Array.isArray(metaFolders)) {
        metaFolders.forEach((f: string) => {
            if (f && f.trim()) folderSet.add(f.trim());
        });
    }

    // MASUKKAN FOLDER LAMA (Dari tabel bookmarks)
    data.forEach((item: any) => {
      if (item.folder) {
        const parts = item.folder.split(',');
        parts.forEach((p: string) => {
          const f = p.trim();
          if (f) folderSet.add(f);
        });
      }
    });

    return NextResponse.json({ folders: Array.from(folderSet) }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}