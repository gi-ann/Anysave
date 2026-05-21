"use client";

import React, { useState, useEffect } from "react";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { SidebarProvider, SidebarInset } from "@/features/sidebar/SidebarCore";
import AppSidebar from "@/features/sidebar/AppSidebar";
import MainContent from "@/features/bookmarks/MainContent";
import AuthScreen from "@/features/auth/AuthScreen";
import { glassSurfaceCss, auroraCss, gradualBlurCss } from "@/components/ui-assets";
import { Loader2 } from "lucide-react";

// Komponen Pembungkus: Mengatur apakah user boleh masuk atau harus login dulu
function AppGuard() {
  const { user, isAuthChecking } = useAppContext();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-transparent flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-500 text-sm font-sans tracking-wide">Menghubungkan ke server...</p>
      </div>
    );
  }

  // Jika belum login, paksa munculkan halaman Login
  if (!user) {
    return <AuthScreen />;
  }

  // Jika sudah login, izinkan akses ke aplikasi utama
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <MainContent />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  
  // Mencegah error Hydration Mismatch pada Next.js
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) return <div className="min-h-screen w-full bg-transparent" />;

  return (
    <AppProvider>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Niconne&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');

        /* Fallback jika URL Google Fonts untuk Instrument Serif mati */
        @font-face {
          font-family: 'Instrument Serif';
          src: url('/InstrumentSerif-Regular.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
        }

        @font-face {
          font-family: 'Instrument Serif Italic';
          src: url('/InstrumentSerif-Italic.ttf') format('truetype');
          font-weight: 400;
          font-style: italic;
        }

        /* FONT BARU: Lastik */
        @font-face {
          font-family: 'Lastik';
          src: url('/Lastik-Regular.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
        }

        /* Menyembunyikan scrollbar namun tetap bisa di-scroll */
        ::-webkit-scrollbar { display: none; width: 0; height: 0; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        
        /* Variabel string CSS dari file ui-assets */
        ${glassSurfaceCss}
        ${auroraCss}
        ${gradualBlurCss}
      `,
        }}
      />
      
      {/* Menggunakan AppGuard sebagai Satpam Penjaga Pintu Aplikasi */}
      <AppGuard />

    </AppProvider>
  );
}