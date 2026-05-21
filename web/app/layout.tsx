import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 1. Mengambil font lokal FixelText (Menggantikan Inter)
// Path "../public/" digunakan karena layout.tsx berada di dalam folder "app"
const fixelText = localFont({
  src: "../public/FixelText-Medium.otf",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anysave",
  description: "Simpan link, gambar, dan ide. Biarkan AI yang merapikannya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Tambahkan suppressHydrationWarning di html agar kebal dari suntikan ekstensi tema
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        // 2. Memasukkan variabel fixelText ke dalam body
        // Tambahkan suppressHydrationWarning di body agar kebal dari suntikan antivirus/adblock
        className={`min-h-screen font-sans antialiased gemini-bg ${fixelText.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}