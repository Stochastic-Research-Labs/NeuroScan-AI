import { Brain } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-muted">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-primary" aria-hidden="true" />
          <span>
            NeuroScan AI &middot; built on{" "}
            <a
              href="https://www.kaggle.com/datasets/dschettler8845/brats-2021-task1"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border-strong underline-offset-2 hover:text-text hover:decoration-primary"
            >
              BraTS 2021 Task 1
            </a>
          </span>
        </div>
        <p className="mono-numeric text-xs">Author: Hamza Mustafa &middot; runs 100% locally</p>
      </div>
    </footer>
  );
}
