import { createClient } from "@supabase/supabase-js";

// Mengambil kunci rahasia dari file .env.local yang baru saja kamu buat
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Membuat jembatan resmi (client) ke database Supabase milikmu
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
