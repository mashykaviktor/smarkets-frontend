import { Section } from "@/components/ui/Section";
import { EventCard } from "@/features/events/components/EventCard";
import type { HomeSection } from "@/features/home/types";

interface CategorySectionProps {
  section: HomeSection;
}

export function CategorySection({ section }: CategorySectionProps) {
  if (section.events.length === 0) {
    return null;
  }

  return (
    <Section title={sectionTitle(section.name)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {section.events.map(({ event, market }) => (
          <EventCard key={event.id} event={event} market={market} />
        ))}
      </div>
    </Section>
  );
}

const SECTION_TITLES: Record<string, string> = {
  "top-events": "Top events",
  "popular-categories": "Popular categories",
};

function sectionTitle(name: string): string {
  return SECTION_TITLES[name] ?? name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
