import { EventDetail } from "@/features/events/components/EventDetail";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
      <EventDetail eventId={eventId} />
    </main>
  );
}
