import type { MarketSummary } from "@/features/markets/types";
import { ContractRow } from "./ContractRow";

interface MarketPriceStripProps {
  market: MarketSummary;
  /** Caps how many contracts render before a "+N more" hint — for the homepage grid, so a 40-runner market doesn't dwarf its neighbours. Omit to show every contract (event page). */
  maxContracts?: number;
}

export function MarketPriceStrip({ market, maxContracts }: MarketPriceStripProps) {
  const contracts =
    maxContracts !== undefined ? market.contracts.slice(0, maxContracts) : market.contracts;
  const hiddenCount = market.contracts.length - contracts.length;

  return (
    <div className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100">
      {contracts.map((contract) => {
        const price = market.prices.find((p) => p.contractId === contract.id) ?? {
          contractId: contract.id,
          back: null,
          lay: null,
          hasPrice: false,
        };
        return <ContractRow key={contract.id} contract={contract} price={price} />;
      })}
      {hiddenCount > 0 && (
        <p className="py-2 text-xs text-zinc-400">+{hiddenCount} more selections</p>
      )}
    </div>
  );
}
