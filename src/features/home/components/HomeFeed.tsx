"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHomeQuery } from "@/features/home/queries";
import { CategorySection } from "./CategorySection";

export function HomeFeed() {
  const { data, isPending, isError, refetch } = useHomeQuery();

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

  const hasEvents = data.sections.some((section) => section.events.length > 0);
  if (!hasEvents) {
    return <EmptyState message="No events available right now — check back soon." />;
  }

  return (
    <div className="flex flex-col gap-8">
      {data.sections.map((section) => (
        <CategorySection key={section.name} section={section} />
      ))}
    </div>
  );
}
