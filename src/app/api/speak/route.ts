import { resolveVoiceboxUrl } from "@/lib/voicebox";

export const dynamic = "force-dynamic";

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  language: string;
}

/** GET /api/speak — Voicebox status + available cloned voice profiles */
export async function GET() {
  const baseUrl = await resolveVoiceboxUrl();
  if (!baseUrl) {
    return Response.json({
      online: false,
      modelLoaded: false,
      profiles: [],
      defaultProfileId: null,
    });
  }

  try {
    const [healthRes, profilesRes] = await Promise.all([
      fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${baseUrl}/profiles`, { signal: AbortSignal.timeout(2000) }),
    ]);
    if (!healthRes.ok || !profilesRes.ok) throw new Error("voicebox error");

    const health = await healthRes.json();
    const profiles = (await profilesRes.json()) as VoiceProfile[];

    return Response.json({
      online: true,
      url: baseUrl,
      modelLoaded: Boolean(health.model_loaded),
      profiles: profiles.map((p) => ({ id: p.id, name: p.name })),
      defaultProfileId:
        process.env.VOICEBOX_PROFILE_ID ?? profiles[0]?.id ?? null,
    });
  } catch {
    return Response.json({
      online: false,
      modelLoaded: false,
      profiles: [],
      defaultProfileId: null,
    });
  }
}

/** POST /api/speak — generate speech with the cloned voice, return WAV audio */
export async function POST(req: Request) {
  const { text, profileId, modelSize } = (await req.json()) as {
    text: string;
    profileId?: string;
    modelSize?: "0.6B" | "1.7B";
  };

  const cleaned = text?.trim().slice(0, 4900);
  if (!cleaned) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const baseUrl = await resolveVoiceboxUrl();
  if (!baseUrl) {
    return Response.json(
      { error: "Voicebox is not running — launch the Voicebox app and try again." },
      { status: 502 }
    );
  }

  try {
    let profile = profileId ?? process.env.VOICEBOX_PROFILE_ID;
    if (!profile) {
      const profilesRes = await fetch(`${baseUrl}/profiles`, {
        signal: AbortSignal.timeout(2000),
      });
      const profiles = (await profilesRes.json()) as VoiceProfile[];
      profile = profiles[0]?.id;
    }
    if (!profile) throw new Error("No Voicebox voice profiles found");

    // generation can take a while for long replies — allow up to 5 min
    const genRes = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profile,
        text: cleaned,
        // 0.6B is ~3x faster than 1.7B with near-identical clone quality
        model_size:
          modelSize ?? process.env.VOICEBOX_MODEL_SIZE ?? "0.6B",
      }),
      signal: AbortSignal.timeout(300000),
    });
    if (!genRes.ok) {
      const detail = await genRes.text().catch(() => "");
      throw new Error(`Voicebox generate HTTP ${genRes.status}: ${detail.slice(0, 200)}`);
    }
    const generation = (await genRes.json()) as { id: string };

    const audioRes = await fetch(`${baseUrl}/audio/${generation.id}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!audioRes.ok || !audioRes.body) {
      throw new Error(`Voicebox audio HTTP ${audioRes.status}`);
    }

    return new Response(audioRes.body, {
      headers: {
        "Content-Type": audioRes.headers.get("Content-Type") ?? "audio/wav",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Voicebox link failure",
      },
      { status: 502 }
    );
  }
}
