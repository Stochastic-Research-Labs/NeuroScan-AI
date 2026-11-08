import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AppLoadingScreen } from "@/components/layout/AppLoadingScreen";

// Bundled locally: no Google Fonts network request at build time or in the browser.
const poppins = localFont({
  src: [
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NeuroScan AI — Brain Tumor Segmentation",
  description:
    "Local brain tumor segmentation viewer for the BraTS 2021 Task 1 dataset, by Hamza Mustafa and Wajid Ali, supervised by Ms. Saira Ishtiaq.",
  authors: [{ name: "Hamza Mustafa" }, { name: "Wajid Ali" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${poppins.variable}`}>
      {/* Some browser extensions add bookkeeping attributes to <body> before React hydrates.
          Limit suppression to this extension-prone root node; child markup still reports real mismatches. */}
      <body suppressHydrationWarning className="min-h-screen flex flex-col font-sans antialiased">
        <AppLoadingScreen />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1 w-full">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
