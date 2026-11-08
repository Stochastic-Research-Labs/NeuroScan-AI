"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Brain, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Workspace" },
  { href: "/metrics", label: "Model insights" },
  { href: "/about", label: "Our project" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 text-text" aria-label="NeuroScan AI home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-glow"><Brain size={23} aria-hidden="true" /></span>
          <span className="text-lg font-semibold tracking-tight">NeuroScan<span className="ml-1.5 text-primary">AI</span></span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
              className={cn("flex min-h-11 items-center rounded-lg px-4 text-xs font-medium transition-colors hover:bg-white/5 hover:text-white", pathname === href ? "text-primary" : "text-text-muted")}>{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/upload" className="hidden min-h-11 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:inline-flex">New analysis <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <button type="button" onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} className="flex h-11 w-11 items-center justify-center rounded-lg text-text lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav">{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {open && <nav id="mobile-nav" className="border-t border-border bg-bg px-5 pb-4 lg:hidden" aria-label="Mobile navigation" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
        {[...LINKS, { href: "/upload", label: "New analysis" }].map(({ href, label }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className="flex min-h-12 items-center border-b border-border/50 py-3 text-sm text-text-muted hover:text-primary">{label}</Link>)}
      </nav>}
    </header>
  );
}
