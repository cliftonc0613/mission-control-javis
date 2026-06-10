import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// The Voicebox app launches its backend on a random localhost port each
// session, so we discover it from the process table rather than hardcoding.
let cached: { url: string; at: number } | null = null;
const CACHE_MS = 30000;

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveVoiceboxUrl(): Promise<string | null> {
  // explicit override always wins
  if (process.env.VOICEBOX_URL) return process.env.VOICEBOX_URL;

  if (cached && Date.now() - cached.at < CACHE_MS) return cached.url;

  // find the voicebox-server listen port (macOS)
  try {
    const { stdout } = await execAsync(
      "lsof -nP -iTCP -sTCP:LISTEN | grep voicebox",
      { timeout: 5000 }
    );
    const ports = [...stdout.matchAll(/127\.0\.0\.1:(\d+)/g)].map((m) => m[1]);
    for (const port of ports) {
      const url = `http://127.0.0.1:${port}`;
      if (await probe(url)) {
        cached = { url, at: Date.now() };
        return url;
      }
    }
  } catch {
    // lsof found nothing — fall through to common defaults
  }

  for (const url of ["http://127.0.0.1:8000", "http://127.0.0.1:17493"]) {
    if (await probe(url)) {
      cached = { url, at: Date.now() };
      return url;
    }
  }

  cached = null;
  return null;
}
