"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Brain, Database, Layers3, LockKeyhole, Pause, Play, ScanLine } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { useReducedMotion } from "@/lib/motion";
import { TUMOR_COLORS } from "@/lib/segmentation-colors";

const BrainScene = dynamic(() => import("./BrainScene"), { ssr: false, loading: () => <BrainFallback /> });

export function BrainFallback() {
  return <div className="flex h-full flex-col items-center justify-center gap-4 text-primary/70"><Brain size={100} strokeWidth={0.75} aria-hidden="true" /><span className="text-xs tracking-widest">ANATOMICAL VISUALIZATION</span></div>;
}

export function LandingExperience() {
  const story = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  return <>
    <div ref={story} className="brain-story mx-auto max-w-7xl px-5 sm:px-8">
      <div className="brain-visual brain-stage">
        <div className="brain-ring" /><div className="brain-ring" />
        <BrainScene storyRef={story} paused={paused || reducedMotion} />
        <div className="pointer-events-none absolute left-4 top-7 text-[10px] uppercase leading-6 tracking-[0.18em] text-text-muted lg:left-10 lg:top-16"><span className="text-primary">Neural architecture</span><br />Anatomical illustration / 3D</div>
        <div className="absolute bottom-5 left-4 right-4 flex items-end justify-between gap-3 lg:bottom-10 lg:left-10">
          <div className="rounded-lg border border-white/10 bg-bg/70 px-4 py-3 backdrop-blur"><p className="text-[10px] uppercase tracking-widest text-text-muted">A journey across scales</p><p className="mt-1 text-xs text-primary">Brain <span className="px-1 text-text-muted">/</span> Neuron <span className="px-1 text-text-muted">/</span> Brain</p></div>
          <button type="button" onClick={() => setPaused(!paused)} disabled={reducedMotion} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg/80 text-text-muted hover:text-primary disabled:opacity-40" aria-label={paused || reducedMotion ? "Enable scroll animation" : "Pause scroll animation"} aria-pressed={paused || reducedMotion}>{paused || reducedMotion ? <Play size={16} /> : <Pause size={16} />}</button>
        </div>
      </div>
      <div className="story-copy">
        <section className="story-panel">
          <p className="eyebrow flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" /> Brain imaging, reimagined</p>
          <h1 className="mt-7 text-[2.8rem] font-medium leading-[1.12] tracking-[-0.045em] sm:text-6xl xl:text-[4.5rem]">See beyond<br />the <span className="text-primary">scan.</span></h1>
          <p className="mt-6 max-w-md text-base leading-8 text-text-muted">Turn multi-modal brain MRI into an explorable view of tumor sub-regions. Built for curiosity. Designed for research.</p>
          <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/upload" size="lg">Start an analysis <ArrowUpRight size={18} aria-hidden="true" /></ButtonLink><ButtonLink href="/dashboard" size="lg" variant="ghost">Open workspace <ArrowRight size={16} aria-hidden="true" /></ButtonLink></div>
          <p className="mt-6 flex items-center gap-2 text-xs text-text-muted"><LockKeyhole size={13} aria-hidden="true" /> Local inference. Your imaging stays in your workspace.</p>
          <a href="#neuron-exploration" className="mt-14 inline-flex min-h-11 w-fit items-center gap-3 text-xs text-text-muted hover:text-primary"><ArrowDown size={16} aria-hidden="true" /> Scroll into the neural world</a>
        </section>
        <section id="neuron-exploration" className="story-panel">
          <p className="eyebrow">01 / A closer look</p><h2 className="mt-5 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">A world within.<br /><span className="text-text-muted">One connection at a time.</span></h2>
          <p className="mt-6 max-w-md text-sm leading-8 text-text-muted">Move from the brain's surface into an illustrative neuron: a cell body, branching dendrites and an axon. Scroll to follow the light along its branches, then pull back to the whole brain.</p>
          <div className="mt-6 flex flex-wrap gap-2">{["Cell body", "Dendrites", "Axon"].map((label) => <span key={label} className="rounded-full border border-primary/20 bg-surface/80 px-4 py-2 text-xs text-primary">{label}</span>)}</div>
          <p className="mt-6 max-w-md border-l border-primary/40 pl-4 text-xs leading-6 text-text-muted">Conceptual illustration, not to scale. Individual neurons and signal activity are not resolved by this application's MRI model. The light pulses are a visual metaphor, not measured activity.</p>
          <a href="#ai-analysis" className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 text-xs text-primary">Return to the bigger picture <ArrowDown size={14} aria-hidden="true" /></a>
        </section>
        <section id="ai-analysis" className="story-panel">
          <p className="eyebrow">02 / Back to the bigger picture</p><h2 className="mt-5 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Four modalities.<br /><span className="text-text-muted">A richer picture.</span></h2>
          <p className="mt-6 max-w-md text-sm leading-8 text-text-muted">T1, contrast-enhanced T1, T2 and FLAIR bring complementary information to a 3D U-Net. Explore its predictions in the context of the original scan.</p>
          <div className="mt-7 grid max-w-sm grid-cols-4 gap-2">{["T1", "T1-CE", "T2", "FLAIR"].map((m, i) => <div key={m} className="rounded-xl border border-primary/15 bg-surface/80 p-3 text-center"><p className="text-[10px] text-text-muted">0{i + 1}</p><p className="mt-2 text-xs font-medium text-primary">{m}</p></div>)}</div>
          <p className="mt-5 text-xs leading-6 text-text-muted">3D NIfTI volumes · BraTS 2021 Task 1<br />Single JPG/PNG slices are not supported by this model.</p>
        </section>
        <section className="story-panel">
          <p className="eyebrow">03 / From prediction to perspective</p><h2 className="mt-5 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Every region.<br /><span className="text-text-muted">In context.</span></h2>
          <p className="mt-6 max-w-md text-sm leading-8 text-text-muted">Switch between the original MRI and segmentation, isolate sub-regions, and inspect predicted volumes. A visual aid for investigation—not an automated diagnosis.</p>
          <ul className="mt-7 max-w-sm divide-y divide-border">{[{ key: "ncr", name: "Necrotic core", label: "NCR / label 1" }, { key: "ed", name: "Peritumoral edema", label: "ED / label 2" }, { key: "et", name: "Enhancing tumor", label: "ET / label 4" }].map(({ key, name, label }) => <li key={key} className="flex items-center gap-3 py-4"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TUMOR_COLORS[key as "ncr" | "ed" | "et"] }} /><span className="flex-1 text-sm">{name}</span><span className="text-[10px] text-text-muted">{label}</span></li>)}</ul>
        </section>
      </div>
    </div>
    <section className="relative border-y border-border bg-surface/60">
      <div className="page-shell grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div><p className="eyebrow">A focused workflow</p><h2 className="mt-4 text-3xl font-medium leading-tight">From study<br />to understanding.</h2><p className="mt-4 max-w-sm text-sm leading-7 text-text-muted">One workspace for your imaging, predictions and research reports.</p></div>
        <ol className="grid gap-8 sm:grid-cols-3">{[{ icon: Database, title: "Prepare", body: "Name your case and add four aligned MRI volumes." }, { icon: Layers3, title: "Segment", body: "Run the local model and follow the real processing state." }, { icon: ScanLine, title: "Explore", body: "Compare views, inspect volumes and export a report." }].map(({ icon: Icon, title, body }, i) => <li key={title} className="border-t border-border pt-5"><div className="flex items-center justify-between"><Icon size={23} className="text-primary" aria-hidden="true" /><span className="text-xs text-text-muted">0{i + 1}</span></div><h3 className="mt-6 text-lg font-medium">{title}</h3><p className="mt-3 text-xs leading-7 text-text-muted">{body}</p></li>)}</ol>
      </div>
    </section>
    <section className="page-shell py-20 text-center lg:py-28"><p className="eyebrow">Built to explore, not to diagnose</p><h2 className="mx-auto mt-5 max-w-2xl text-3xl font-medium tracking-tight sm:text-5xl">Your next insight starts<br />with a closer look.</h2><div className="mt-8"><ButtonLink href="/upload" size="lg">Open a new study <ArrowUpRight size={18} aria-hidden="true" /></ButtonLink></div><p className="mx-auto mt-6 max-w-lg text-xs leading-6 text-text-muted">Research prototype. Predictions require expert review. Per-case confidence is not estimated by the current model.</p><Link href="/about#asset-credits" className="mt-6 inline-block text-[10px] text-text-muted underline underline-offset-4 hover:text-primary">3D anatomy credits &amp; project team</Link></section>
  </>;
}
