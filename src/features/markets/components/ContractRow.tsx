import type { Contract, ContractPrice } from "@/domain/models";
import { PriceButton } from "@/features/prices/components/PriceButton";

interface ContractRowProps {
  contract: Contract;
  price: ContractPrice;
}

export function ContractRow({ contract, price }: ContractRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="truncate text-sm text-zinc-700">{contract.name}</span>
      <div className="flex gap-2">
        <PriceButton side={price.back} label="Back" contractName={contract.name} />
        <PriceButton side={price.lay} label="Lay" contractName={contract.name} />
      </div>
    </div>
  );
}
