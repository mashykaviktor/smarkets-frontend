import type { SmarketsEvent, SmarketsHomeSection } from "@/server/smarkets/types";
import { toEvent } from "@/features/events/adapters";
import type { Event } from "@/domain/models";

const CATEGORY_SCOPE = "category";
const MAX_EVENTS_PER_SECTION = 8;

export interface ResolvedHomeSection {
  name: string;
  category: string;
  events: Event[];
}

/**
 * Resolves each home section's event refs into bettable LEAF events:
 * - directly bettable events are kept as-is
 * - category-scope nodes (nav shortcuts, e.g. "politics:world:brazil") are
 *   replaced by their resolved children, supplied via `childrenByParentId`
 *   (from a single batched `parent_id` query — see server/smarkets/endpoints.ts)
 * - anything neither bettable nor a category node is dropped
 *
 * Order is preserved, duplicates within a section are removed, and each
 * section is capped so the homepage grid stays readable (a resolved
 * category node can expand to 50+ children).
 */
export function buildHomeSections(
  sections: readonly SmarketsHomeSection[],
  eventsById: ReadonlyMap<string, SmarketsEvent>,
  childrenByParentId: ReadonlyMap<string, readonly SmarketsEvent[]>,
): ResolvedHomeSection[] {
  return sections.map((section) => {
    const seen = new Set<string>();
    const resolved: SmarketsEvent[] = [];

    for (const ref of section.events) {
      if (resolved.length >= MAX_EVENTS_PER_SECTION) break;

      const event = eventsById.get(ref.event_id);
      if (!event) continue;

      if (event.type.scope === CATEGORY_SCOPE) {
        const children = childrenByParentId.get(event.id) ?? [];
        for (const child of children) {
          if (resolved.length >= MAX_EVENTS_PER_SECTION) break;
          if (child.bettable && !seen.has(child.id)) {
            seen.add(child.id);
            resolved.push(child);
          }
        }
        continue;
      }

      if (event.bettable && !seen.has(event.id)) {
        seen.add(event.id);
        resolved.push(event);
      }
    }

    return {
      name: section.name,
      category: section.category,
      events: resolved.map(toEvent),
    };
  });
}
