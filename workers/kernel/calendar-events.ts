export type CalendarEventRecord = {
  title: string;
  eventDate: string;
  eventType: string;
  status: string;
};

export function upcomingEventLines(events: readonly CalendarEventRecord[], today: string): string[] {
  return events
    .filter((event) => event.status === 'scheduled' && event.eventDate >= today)
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
    .map((event) => `${event.eventDate}: ${event.title} (${event.eventType})`);
}

export function refusalToEditCancelledEvent(status: string): string | null {
  if (status === 'cancelled') {
    return 'That event is cancelled.';
  }
  return null;
}
