import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatStartDate } from "@/lib/format";
import type { Event } from "@/domain/models";
import { EVENT_STATE_LABEL, EVENT_STATE_TONE } from "@/features/events/eventStateBadge";
import type { MarketSummary } from "@/features/markets/types";
import { MarketPriceStrip } from "@/features/markets/components/MarketPriceStrip";

interface EventCardProps {
  event: Event;
  market: MarketSummary | null;
}

export function EventCard({ event, market }: EventCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link
        href={`/events/${event.id}`}
        className="flex flex-col gap-1.5 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-900"
      >
        <div className="flex items-center gap-2">
          <Badge tone={EVENT_STATE_TONE[event.state]}>{EVENT_STATE_LABEL[event.state]}</Badge>
          <span className="text-xs text-zinc-500">{formatStartDate(event.startDatetime)}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">{event.name}</h3>
        {market && <p className="text-xs text-zinc-500">{market.market.name}</p>}
      </Link>
      {market ? (
        <div className="px-3 pb-3">
          <MarketPriceStrip market={market} maxContracts={6} />
        </div>
      ) : (
        <p className="px-3 pb-3 text-xs text-zinc-500">No markets available.</p>
      )}
    </Card>
  );
}
