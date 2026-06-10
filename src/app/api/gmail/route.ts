import { google } from "googleapis";
import {
  getOAuthClient,
  googleConfigured,
  notConfiguredResponse,
} from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleConfigured()) return notConfiguredResponse("GMAIL");

  try {
    const gmail = google.gmail({ version: "v1", auth: getOAuthClient() });

    const [labelRes, listRes] = await Promise.all([
      gmail.users.labels.get({ userId: "me", id: "INBOX" }),
      gmail.users.messages.list({
        userId: "me",
        labelIds: ["INBOX"],
        maxResults: 5,
      }),
    ]);

    const ids = listRes.data.messages ?? [];
    const messages = await Promise.all(
      ids.map(async ({ id }) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });
        const headers = msg.data.payload?.headers ?? [];
        const h = (name: string) =>
          headers.find((x) => x.name === name)?.value ?? "";
        return {
          subject: h("Subject") || "(no subject)",
          from: h("From").replace(/<.*>/, "").trim(),
          date: h("Date"),
          unread: msg.data.labelIds?.includes("UNREAD") ?? false,
        };
      })
    );

    return Response.json({
      configured: true,
      unreadCount: labelRes.data.messagesUnread ?? 0,
      messages,
    });
  } catch (err) {
    return Response.json(
      {
        configured: true,
        error: err instanceof Error ? err.message : "gmail link failure",
      },
      { status: 500 }
    );
  }
}
