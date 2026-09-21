import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
      <Inbox className="h-6 w-6 text-zinc-400" aria-hidden="true" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
