import { google } from "googleapis";
import {
  getOAuthClient,
  googleConfigured,
  notConfiguredResponse,
} from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleConfigured()) return notConfiguredResponse("CALENDAR");

  try {
    const calendar = google.calendar({ version: "v3", auth: getOAuthClient() });

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [todayRes, upcomingRes] = await Promise.all([
      calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10,
      }),
      calendar.events.list({
        calendarId: "primary",
        timeMin: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 3,
      }),
    ]);

    const fmt = (e: {
      summary?: string | null;
      start?: { dateTime?: string | null; date?: string | null } | null;
      location?: string | null;
      htmlLink?: string | null;
    }) => ({
      title: e.summary ?? "(untitled)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      allDay: !e.start?.dateTime,
      location: e.location ?? null,
      link: e.htmlLink ?? null,
    });

    return Response.json({
      configured: true,
      today: (todayRes.data.items ?? []).map(fmt),
      upcoming: (upcomingRes.data.items ?? []).map(fmt),
    });
  } catch (err) {
    return Response.json(
      {
        configured: true,
        error: err instanceof Error ? err.message : "calendar link failure",
      },
      { status: 500 }
    );
  }
}
