import { describe, expect, it } from "vitest";
import { buildHomeSections } from "@/features/home/adapters";
import type { SmarketsEvent, SmarketsHomeSection } from "@/server/smarkets/types";

// Trimmed, realistic fixtures — ids and shapes drawn from
// docs/research/api-samples/{popular-home,events-batch,events-children-by-parent}.json.
function makeEvent(overrides: Partial<SmarketsEvent> & Pick<SmarketsEvent, "id">): SmarketsEvent {
  return {
    parent_id: null,
    name: `Event ${overrides.id}`,
    short_name: null,
    slug: `event-${overrides.id}`,
    full_slug: `/event-${overrides.id}`,
    state: "upcoming",
    start_datetime: "2026-10-04T12:00:00Z",
    bettable: true,
    bet_allowed: true,
    hidden: false,
    display_order: 0,
    type: { domain: "politics", scope: "single_event" },
    ...overrides,
  };
}

describe("buildHomeSections", () => {
  const directEvent = makeEvent({ id: "45102796", name: "Brazil Presidential Election" });

  const categoryNode = makeEvent({
    id: "946642",
    name: "Brazil",
    bettable: false,
    type: { domain: "politics", scope: "category" },
  });

  const nonBettableJunk = makeEvent({ id: "999", bettable: false, type: { domain: "politics", scope: "single_event" } });

  const child1 = makeEvent({ id: "44276763", parent_id: "946642", name: "Brazil child 1" });
  const child2 = makeEvent({ id: "44276764", parent_id: "946642", name: "Brazil child 2" });

  const sections: SmarketsHomeSection[] = [
    {
      name: "top-events",
      category: "all",
      events: [
        { event_id: "45102796", layout: "tall", nav_key: null },
        { event_id: "999", layout: "standard", nav_key: null },
      ],
    },
    {
      name: "popular-categories",
      category: "categories",
      events: [{ event_id: "946642", layout: "half", nav_key: "politics:world:brazil" }],
    },
  ];

  const eventsById = new Map(
    [directEvent, categoryNode, nonBettableJunk].map((e) => [e.id, e]),
  );

  it("keeps directly bettable events and excludes non-bettable, non-category events", () => {
    const resolved = buildHomeSections(sections, eventsById, new Map());

    const topEvents = resolved.find((s) => s.name === "top-events");
    expect(topEvents?.events.map((e) => e.id)).toEqual(["45102796"]);
  });

  it("replaces a category-scope node with its resolved bettable children", () => {
    const childrenByParentId = new Map([["946642", [child1, child2]]]);

    const resolved = buildHomeSections(sections, eventsById, childrenByParentId);

    const popularCategories = resolved.find((s) => s.name === "popular-categories");
    expect(popularCategories?.events.map((e) => e.id)).toEqual(["44276763", "44276764"]);
  });

  it("drops non-bettable children when resolving a category node", () => {
    const nonBettableChild = makeEvent({ id: "1", parent_id: "946642", bettable: false });
    const childrenByParentId = new Map([["946642", [nonBettableChild, child1]]]);

    const resolved = buildHomeSections(sections, eventsById, childrenByParentId);

    const popularCategories = resolved.find((s) => s.name === "popular-categories");
    expect(popularCategories?.events.map((e) => e.id)).toEqual(["44276763"]);
  });

  it("skips event refs with no matching fetched event", () => {
    const sectionsWithMissing: SmarketsHomeSection[] = [
      { name: "top-events", category: "all", events: [{ event_id: "unknown", layout: null, nav_key: null }] },
    ];

    const resolved = buildHomeSections(sectionsWithMissing, eventsById, new Map());

    expect(resolved[0]?.events).toEqual([]);
  });
});
