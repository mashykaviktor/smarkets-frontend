import { EmptyState } from "@/components/ui/EmptyState";
import type { MarketSummary } from "@/features/markets/types";
import { MarketCard } from "./MarketCard";

interface MarketListProps {
  markets: MarketSummary[];
}

export function MarketList({ markets }: MarketListProps) {
  if (markets.length === 0) {
    return <EmptyState message="No markets are currently available for this event." />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {markets.map((summary) => (
        <MarketCard key={summary.market.id} summary={summary} />
      ))}
    </div>
  );
}
