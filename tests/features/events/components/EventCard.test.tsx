import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventCard } from "@/features/events/components/EventCard";
import type { Event } from "@/domain/models";

const EVENT: Event = {
  id: "45102796",
  name: "Brazil Presidential Election",
  shortName: null,
  slug: "brazil-presidential-election",
  state: "upcoming",
  startDatetime: "2026-10-04T12:00:00Z",
  bettable: true,
};

describe("EventCard", () => {
  it("links to the event's own page", () => {
    render(<EventCard event={EVENT} market={null} />);

    expect(screen.getByRole("link", { name: /brazil presidential election/i })).toHaveAttribute(
      "href",
      "/events/45102796",
    );
  });

  it('shows a "no markets" message when the event has none', () => {
    render(<EventCard event={EVENT} market={null} />);

    expect(screen.getByText("No markets available.")).toBeInTheDocument();
  });
});
