import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceUpdateAnnouncer } from "@/features/prices/components/PriceUpdateAnnouncer";

describe("PriceUpdateAnnouncer", () => {
  it("renders nothing announceable before the first successful poll", () => {
    render(<PriceUpdateAnnouncer updatedAt={0} />);

    expect(screen.queryByText("Prices updated")).not.toBeInTheDocument();
  });

  it("announces once a poll has resolved, in a single polite live region (not per contract)", () => {
    render(<PriceUpdateAnnouncer updatedAt={1_700_000_000_000} />);

    const region = screen.getByText("Prices updated").parentElement;
    expect(region).toHaveAttribute("aria-live", "polite");
  });
});
