export const dynamic = "force-dynamic";

// Voicebox (voicebox.sh) — local voice-cloning TTS server bundled with the
// macOS app. The dashboard proxies it so the browser avoids CORS issues.
const VOICEBOX_URL = process.env.VOICEBOX_URL ?? "http://127.0.0.1:17493";

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  language: string;
}

/** GET /api/speak — Voicebox status + available cloned voice profiles */
export async function GET() {
  try {
    const [healthRes, profilesRes] = await Promise.all([
      fetch(`${VOICEBOX_URL}/health`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${VOICEBOX_URL}/profiles`, { signal: AbortSignal.timeout(2000) }),
    ]);
    if (!healthRes.ok || !profilesRes.ok) throw new Error("voicebox error");

    const health = await healthRes.json();
    const profiles = (await profilesRes.json()) as VoiceProfile[];

    return Response.json({
      online: true,
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
  const { text, profileId } = (await req.json()) as {
    text: string;
    profileId?: string;
  };

  const cleaned = text?.trim().slice(0, 4900);
  if (!cleaned) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    let profile = profileId ?? process.env.VOICEBOX_PROFILE_ID;
    if (!profile) {
      const profilesRes = await fetch(`${VOICEBOX_URL}/profiles`, {
        signal: AbortSignal.timeout(2000),
      });
      const profiles = (await profilesRes.json()) as VoiceProfile[];
      profile = profiles[0]?.id;
    }
    if (!profile) throw new Error("No Voicebox voice profiles found");

    // generation can take a while for long replies — allow up to 5 min
    const genRes = await fetch(`${VOICEBOX_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profile, text: cleaned }),
      signal: AbortSignal.timeout(300000),
    });
    if (!genRes.ok) {
      const detail = await genRes.text().catch(() => "");
      throw new Error(`Voicebox generate HTTP ${genRes.status}: ${detail.slice(0, 200)}`);
    }
    const generation = (await genRes.json()) as { id: string };

    const audioRes = await fetch(`${VOICEBOX_URL}/audio/${generation.id}`, {
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
