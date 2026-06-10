import { google } from "googleapis";
import {
  getOAuthClient,
  googleConfigured,
  notConfiguredResponse,
} from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleConfigured()) return notConfiguredResponse("DRIVE");

  try {
    const drive = google.drive({ version: "v3", auth: getOAuthClient() });

    const [filesRes, aboutRes] = await Promise.all([
      drive.files.list({
        pageSize: 5,
        orderBy: "modifiedTime desc",
        fields: "files(id, name, mimeType, modifiedTime)",
        q: "trashed = false",
      }),
      drive.about.get({ fields: "storageQuota" }),
    ]);

    const quota = aboutRes.data.storageQuota;

    return Response.json({
      configured: true,
      files: (filesRes.data.files ?? []).map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
      })),
      storage: {
        used: Number(quota?.usage ?? 0),
        total: Number(quota?.limit ?? 0),
      },
    });
  } catch (err) {
    return Response.json(
      {
        configured: true,
        error: err instanceof Error ? err.message : "drive link failure",
      },
      { status: 500 }
    );
  }
}
