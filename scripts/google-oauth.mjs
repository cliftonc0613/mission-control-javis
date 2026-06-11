#!/usr/bin/env node
/**
 * One-shot Google OAuth helper for CLIFTON AI Mission Control.
 *
 * Mints a refresh token for the Calendar / Gmail / Drive panels and writes it
 * to .env.local — no OAuth Playground needed.
 *
 * Prereqs (see SETUP.md §2a):
 *   1. OAuth client of type "Web application" in Google Cloud Console
 *      with authorized redirect URI:  http://localhost:3000/oauth2callback
 *   2. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET filled in .env.local
 *
 * Usage:  node scripts/google-oauth.mjs
 */
import { google } from "googleapis";
import { createServer } from "http";
import { execFile } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(ROOT, ".env.local");
const REDIRECT_URI = "http://localhost:3000/oauth2callback"; // must match src/lib/google.ts
const PORT = 3000;

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

function readEnv() {
  try {
    return readFileSync(ENV_PATH, "utf8");
  } catch {
    console.error(`✗ ${ENV_PATH} not found. Copy .env.local.example first.`);
    process.exit(1);
  }
}

function envValue(env, key) {
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1].trim() ?? "";
}

function upsertEnv(env, key, value) {
  if (new RegExp(`^${key}=`, "m").test(env)) {
    return env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  }
  return `${env.trimEnd()}\n${key}=${value}\n`;
}

const env = readEnv();
const clientId = envValue(env, "GOOGLE_CLIENT_ID");
const clientSecret = envValue(env, "GOOGLE_CLIENT_SECRET");

if (!clientId || !clientSecret) {
  console.error(
    "✗ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing in .env.local.\n" +
      "  Create the OAuth client first (SETUP.md §2a), paste both values in, then rerun."
  );
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a refresh token even if previously authorized
  scope: SCOPES,
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    res.end(`Authorization failed: ${error ?? "no code returned"}. Check the terminal.`);
    console.error(`✗ Authorization failed: ${error ?? "no code returned"}`);
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token returned. Remove this app's access at myaccount.google.com/permissions and rerun."
      );
    }
    writeFileSync(ENV_PATH, upsertEnv(readEnv(), "GOOGLE_REFRESH_TOKEN", tokens.refresh_token));
    res.end("✓ Mission Control is authorized. You can close this tab and return to the terminal.");
    console.log("✓ Refresh token saved to .env.local (GOOGLE_REFRESH_TOKEN).");
    console.log("  Restart the dev server and the Calendar / Gmail / Drive panels go live.");
    server.close();
    process.exit(0);
  } catch (err) {
    res.end(`Token exchange failed: ${err.message}. Check the terminal.`);
    console.error(`✗ Token exchange failed: ${err.message}`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("Opening Google consent screen…\n");
  console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);
  execFile("open", [authUrl]); // macOS
});
