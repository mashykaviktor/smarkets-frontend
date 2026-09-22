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
    <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
      {markets.map((summary) => (
        <MarketCard key={summary.market.id} summary={summary} />
      ))}
    </div>
  );
}
