"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/apiClient";
import { useEventQuery } from "@/features/events/queries";
import { applyLivePrices } from "@/features/markets/adapters";
import { MarketList } from "@/features/markets/components/MarketList";
import { ThrottledNotice } from "@/features/prices/components/ThrottledNotice";
import { usePriceRefresh } from "@/features/prices/usePriceRefresh";
import { EventHeader } from "./EventHeader";

interface EventDetailProps {
  eventId: string;
}

export function EventDetail({ eventId }: EventDetailProps) {
  const { data, isPending, isError, error, refetch } = useEventQuery(eventId);

  const { marketIds, contractIds } = useMemo(() => {
    if (!data) return { marketIds: [], contractIds: [] };
    return {
      marketIds: data.markets.map((m) => m.market.id),
      contractIds: data.markets.flatMap((m) => m.contracts.map((c) => c.id)),
    };
  }, [data]);
  const { prices, isThrottled } = usePriceRefresh(marketIds, contractIds);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading event">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return <EmptyState message="This event could not be found." />;
    }
    return <ErrorState message="Couldn't load this event." onRetry={() => refetch()} />;
  }

  const liveMarkets = data.markets.map((market) => applyLivePrices(market, prices));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All events
      </Link>
      <EventHeader event={data.event} />
      <ThrottledNotice isThrottled={isThrottled} />
      <MarketList markets={liveMarkets} />
    </div>
  );
}
