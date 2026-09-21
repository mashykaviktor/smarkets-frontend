import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <section aria-labelledby={`section-${slugify(title)}`} className="flex flex-col gap-3">
      <h2 id={`section-${slugify(title)}`} className="text-sm font-semibold text-zinc-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
