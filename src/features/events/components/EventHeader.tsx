import { Badge } from "@/components/ui/Badge";
import { formatStartDate } from "@/lib/format";
import type { Event } from "@/domain/models";
import { EVENT_STATE_LABEL, EVENT_STATE_TONE } from "@/features/events/eventStateBadge";

interface EventHeaderProps {
  event: Event;
}

export function EventHeader({ event }: EventHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-zinc-200 pb-4">
      <div className="flex items-center gap-2">
        <Badge tone={EVENT_STATE_TONE[event.state]}>{EVENT_STATE_LABEL[event.state]}</Badge>
        <span className="text-sm text-zinc-500">{formatStartDate(event.startDatetime)}</span>
      </div>
      <h1 className="text-xl font-semibold text-zinc-900">{event.name}</h1>
    </header>
  );
}
