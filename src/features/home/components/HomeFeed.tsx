"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { applyLivePricesToHome, collectMarketAndContractIds } from "@/features/home/adapters";
import { useHomeQuery } from "@/features/home/queries";
import { PriceUpdateAnnouncer } from "@/features/prices/components/PriceUpdateAnnouncer";
import { ThrottledNotice } from "@/features/prices/components/ThrottledNotice";
import { usePriceRefresh } from "@/features/prices/usePriceRefresh";
import { CategorySection } from "./CategorySection";

export function HomeFeed() {
  const { data, isPending, isError, refetch } = useHomeQuery();

  const { marketIds, contractIds } = useMemo(
    () => (data ? collectMarketAndContractIds(data.sections) : { marketIds: [], contractIds: [] }),
    [data],
  );
  const { prices, isThrottled, dataUpdatedAt } = usePriceRefresh(marketIds, contractIds);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading homepage">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Couldn't load the homepage." onRetry={() => refetch()} />;
  }

  const liveData = applyLivePricesToHome(data, prices);
  const hasEvents = liveData.sections.some((section) => section.events.length > 0);
  if (!hasEvents) {
    return <EmptyState message="No events available right now — check back soon." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PriceUpdateAnnouncer updatedAt={dataUpdatedAt} />
      <ThrottledNotice isThrottled={isThrottled} />
      <div className="flex flex-col gap-8">
        {liveData.sections.map((section) => (
          <CategorySection key={section.name} section={section} />
        ))}
      </div>
    </div>
  );
}
