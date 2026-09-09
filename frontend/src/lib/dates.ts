// Parse calendar dates at UTC midnight so browser timezones cannot shift the day.
export function parseCalendarDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(parseCalendarDate(date));
}
