import { Card } from "@/components/ui/Card";
import type { MarketSummary } from "@/features/markets/types";
import { MarketPriceStrip } from "./MarketPriceStrip";

interface MarketCardProps {
  summary: MarketSummary;
}

export function MarketCard({ summary }: MarketCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3">
        <h3 className="text-sm font-semibold text-zinc-900">{summary.market.name}</h3>
        {summary.market.winnerCount > 1 && (
          <span className="text-xs text-zinc-500">{summary.market.winnerCount} winners</span>
        )}
      </div>
      <div className="px-3 pb-3">
        <MarketPriceStrip market={summary} />
      </div>
    </Card>
  );
}
