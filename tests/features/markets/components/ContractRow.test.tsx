import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContractRow } from "@/features/markets/components/ContractRow";
import type { Contract, ContractPrice } from "@/domain/models";

const CONTRACT: Contract = { id: "c1", marketId: "m1", name: "Luiz Inácio Lula da Silva", displayOrder: 0 };

describe("ContractRow", () => {
  it("renders the contract name and formatted back/lay odds", () => {
    const price: ContractPrice = {
      contractId: "c1",
      back: { decimalOdds: 2.48, priceBp: 4032, stake: 10 },
      lay: { decimalOdds: 2.64, priceBp: 3788, stake: 20 },
      hasPrice: true,
    };

    render(<ContractRow contract={CONTRACT} price={price} />);

    expect(screen.getByText("Luiz Inácio Lula da Silva")).toBeInTheDocument();
    expect(screen.getByText("2.48")).toBeInTheDocument();
    expect(screen.getByText("2.64")).toBeInTheDocument();
  });

  it('renders "—" for a side with no liquidity, not NaN/Infinity/blank', () => {
    const price: ContractPrice = { contractId: "c1", back: null, lay: null, hasPrice: false };

    render(<ContractRow contract={CONTRACT} price={price} />);

    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
  });

  it("renders extreme-but-valid ticks without hiding them: price 1 -> 10000.0", () => {
    const price: ContractPrice = {
      contractId: "c1",
      back: { decimalOdds: 10000, priceBp: 1, stake: 1 },
      lay: null,
      hasPrice: true,
    };

    render(<ContractRow contract={CONTRACT} price={price} />);

    expect(screen.getByText("10000.0")).toBeInTheDocument();
  });

  it("renders extreme-but-valid ticks without hiding them: price 9999 -> 1.00", () => {
    const price: ContractPrice = {
      contractId: "c1",
      back: { decimalOdds: 10000 / 9999, priceBp: 9999, stake: 1 },
      lay: null,
      hasPrice: true,
    };

    render(<ContractRow contract={CONTRACT} price={price} />);

    expect(screen.getByText("1.00")).toBeInTheDocument();
  });
});
