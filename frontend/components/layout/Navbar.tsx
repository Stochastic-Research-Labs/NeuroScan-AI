"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Brain, Menu, X, LayoutDashboard, Upload, LineChart, Info, ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/metrics", label: "Metrics", icon: LineChart },
  { href: "/about", label: "About", icon: Info },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {pathname !== "/" && (
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-card transition-colors"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-text"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-glow">
              <Brain size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-base tracking-tight hidden sm:inline-block">
              NeuroScan <span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:text-text hover:bg-card"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
          <ShieldCheck size={14} aria-hidden="true" /> Local workspace
        </div>

        <button
          type="button"
          className="md:hidden flex h-11 w-11 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-card"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="md:hidden border-t border-border px-4 py-2" aria-label="Mobile">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium min-h-[44px]",
                  active ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text hover:bg-card"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
