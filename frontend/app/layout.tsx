import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AppLoadingScreen } from "@/components/layout/AppLoadingScreen";

export const metadata: Metadata = {
  title: "NeuroScan AI — Brain Tumor Segmentation",
  description:
    "Local brain tumor segmentation viewer for the BraTS 2021 Task 1 dataset, by Hamza Mustafa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
      </body>
    </html>
  );
}
