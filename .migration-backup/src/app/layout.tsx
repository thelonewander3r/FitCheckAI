import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "FitCheck AI — Dress for the event",
  description:
    "AI-powered outfit checks built from your wardrobe. Describe the event, see what works, and understand what is missing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${sourceSerif4.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <footer className="border-t border-[#e2e8f0] bg-white px-6 py-6 text-center text-xs text-[#718096]">
          FitCheck AI — outfit guidance only, not professional styling or
          medical advice.
        </footer>
      </body>
    </html>
  );
}
