import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size={28} label="Loading case" />
    </div>
  );
}
