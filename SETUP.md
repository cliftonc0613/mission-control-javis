# CLIFTON AI Mission Control — Setup Guide

Iron Man HUD-style personal command center built with Next.js (App Router), TypeScript, and Tailwind CSS.

```bash
cp .env.local.example .env.local   # fill in credentials below
npm install
npm run dev                        # → http://localhost:3000
```

The dashboard works out of the box with **zero credentials** — system telemetry is always live, and other panels show DEMO/OFFLINE states until you add keys.

---

## 1. Jarvis AI Providers (chat)

Jarvis supports **three AI providers** — configure any or all, then switch between them with the **AI CORE** selector buttons at the top of the chat panel (● = key configured, ○ = missing). Your choice is remembered between sessions.

| Provider | Get a key | Env vars | Default model |
|---|---|---|---|
| **CLAUDE** (Anthropic) | [console.anthropic.com](https://console.anthropic.com) | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
| **CHATGPT** (OpenAI) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY`, optional `OPENAI_MODEL` | `gpt-4o` |
| **OPENROUTER** (any model) | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL` | `anthropic/claude-sonnet-4` |

OpenRouter gives you one key for hundreds of models (Claude, GPT, Gemini, Llama, DeepSeek…) — set `OPENROUTER_MODEL` to any [model slug](https://openrouter.ai/models), e.g. `google/gemini-2.5-pro` or `meta-llama/llama-4-maverick`.

All providers stream responses. Voice input uses the browser Web Speech API (Chrome/Edge) — hold the 🎙 button to speak.

### Voice replies (Jarvis talks back)

Click the **voice toggle** in the chat header to cycle modes:

| Mode | Engine | Latency |
|---|---|---|
| 🔇 VOICE OFF | — | — |
| 🔊 SYSTEM | Browser speech synthesis | instant |
| 🗣 CLIFTON | [Voicebox](https://voicebox.sh) local voice clone | ~15s+ per reply (local Qwen3-TTS on Apple Silicon) |

The CLIFTON mode appears automatically when the Voicebox app is running (it serves a local API on `127.0.0.1:17493`). The dashboard proxies it through `POST /api/speak` and plays the generated WAV. Optional overrides in `.env.local`:

```
VOICEBOX_URL=http://127.0.0.1:17493
VOICEBOX_PROFILE_ID=   # specific voice profile; defaults to your first one
```

Tip: keep replies short in clone mode — synthesis time scales with reply length. The first generation after launching Voicebox loads the model (~2-3 min); after that it stays warm.

---

## 2. Google OAuth (Calendar, Gmail, Drive)

### 2a. Create the OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create (or pick) a project.
2. **APIs & Services → Library**: enable these three APIs:
   - Google Calendar API
   - Gmail API
   - Google Drive API
3. **APIs & Services → OAuth consent screen**: configure as *External*, add your Google account as a **test user**.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://developers.google.com/oauthplayground`
5. Copy the **Client ID** and **Client Secret** into `.env.local`.

### 2b. Get a refresh token (OAuth Playground)

1. Open [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Click the ⚙️ gear (top right) → check **Use your own OAuth credentials** → paste your Client ID + Secret.
3. In the left scope list, select (or paste into the input box):
   ```
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/drive.readonly
   ```
4. Click **Authorize APIs** → sign in with your Google account → allow.
5. Click **Exchange authorization code for tokens**.
6. Copy the **Refresh token** into `.env.local`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_REFRESH_TOKEN=1//0g...
   ```

> **Note:** While the consent screen is in "Testing" mode, refresh tokens expire after 7 days. Publish the app (no verification needed for personal use with these scopes on your own account) for a long-lived token.

---

## 3. SocialCrawl (social media stats)

1. Sign up at [socialcrawl.dev](https://www.socialcrawl.dev) and grab your API key.
2. Add to `.env.local`:
   ```
   SOCIALCRAWL_API_KEY=sc_...
   SOCIAL_INSTAGRAM_HANDLE=yourhandle
   SOCIAL_TWITTER_HANDLE=yourhandle
   SOCIAL_LINKEDIN_HANDLE=yourhandle
   SOCIAL_FACEBOOK_HANDLE=yourpage
   ```

The dashboard calls `GET https://www.socialcrawl.dev/v1/{platform}/profile?handle=...` with the `x-api-key` header (1 credit per platform per refresh; the panel refreshes every 10 minutes). Panels without a key or handle fall back to **DEMO** data and are labeled `○ DEMO` instead of `● LIVE`.

---

## Architecture

| Route | Purpose |
|---|---|
| `POST /api/system` | CPU / RAM / disk / network via `systeminformation`, polled every 2s |
| `POST /api/jarvis` | Streaming Claude chat (`claude-sonnet-4-6`) |
| `GET /api/calendar` | Today's events + next 3 upcoming |
| `GET /api/gmail` | Unread count + 5 recent subjects |
| `GET /api/drive` | 5 recent files + storage quota |
| `GET /api/social` | Follower / post / engagement stats × 4 platforms |

UI: `src/components/` — `HudPanel` (glowing holo frame), `ArcReactor` (spinning SVG core), `JarvisChat` (streaming + hold-to-talk voice), `SystemStats`, `GooglePanel`, `SocialStats` (animated counters), `HudClock`.

Theme colors live in `src/app/globals.css` under `@theme` — primary `#f66602`, deep accent `#cc5200`, background `#000814`, alerts `#ffffff`.
