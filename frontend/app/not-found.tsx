import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
        <SearchX size={22} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-text">Page not found</h2>
      <p className="text-sm text-text-muted max-w-md">
        The page you&apos;re looking for doesn&apos;t exist, or the case may have been deleted.
      </p>
      <ButtonLink href="/">Back to dashboard</ButtonLink>
    </div>
  );
}
