export const dynamic = "force-dynamic";

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
}

/** GET /api/jarvis/models — OpenRouter's public model catalog (no key needed) */
export async function GET() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      // catalog changes rarely — cache for an hour
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);

    const json = (await res.json()) as { data?: OpenRouterModel[] };
    const models = (json.data ?? [])
      .map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        context: m.context_length ?? 0,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return Response.json({ models });
  } catch (err) {
    return Response.json(
      {
        models: [],
        error: err instanceof Error ? err.message : "catalog fetch failed",
      },
      { status: 500 }
    );
  }
}
