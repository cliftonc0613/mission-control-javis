# CLIFTON AI — Mission Control Dashboard

A personal command center for Clifton Canady, powered by JARVIS: an Iron Man HUD-style dashboard that blends real-time system telemetry, intelligent AI assistance, and seamless service integration into one unified interface.

**Live at:** https://github.com/cliftonc0613/mission-control-javis

---

## 🎯 What is JARVIS?

JARVIS is your personal AI assistant operating inside the CLIFTON AI Mission Control dashboard. Think of it as Tony Stark's JARVIS, but for your digital life: it monitors your system, reads your calendar, checks your email, searches the web, and executes tasks — all with calm, dry wit and impeccable competence.

**Current Capabilities:**
- 💬 **Streaming AI Chat** — Real-time responses from Claude (Anthropic), ChatGPT (OpenAI), or any model via OpenRouter
- 🗣️ **Voice I/O** — Speak to Jarvis (hold the mic button) and he talks back in your own cloned voice (local TTS via Voicebox)
- 📊 **Live System Telemetry** — Real-time CPU, RAM, disk, and network monitoring
- 📅 **Google Integration** — Calendar events, Gmail unread count, Google Drive files
- 📱 **Social Media Stats** — Instagram, Twitter/X, LinkedIn, Facebook followers and engagement
- ⚡ **Arc Reactor Visualization** — The reactor core pulses and spins with Jarvis's voice, waveform bars radiate during speech

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- One or more AI provider API keys (Anthropic, OpenAI, or OpenRouter)
- Optional: Google OAuth credentials for Calendar/Gmail/Drive
- Optional: SocialCrawl API key for social stats
- Optional: Voicebox app (macOS) for cloned voice output

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cliftonc0613/mission-control-javis.git
   cd mission-control-javis
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

---

## 📋 Feature Breakdown

### AI Chat (JARVIS Interface)

**Multi-Provider Support:**
- **Claude** (Anthropic) — Default, recommended for most use cases
- **ChatGPT** (OpenAI) — Direct OpenAI API
- **OpenRouter** — One key, hundreds of models (Claude, GPT, Gemini, Llama, DeepSeek, etc.)

Switch providers in real-time using the **AI CORE** selector buttons in the chat panel.

**Voice Features:**
- **Hold-to-talk input** — Browser Web Speech API (Chrome/Edge recommended)
- **Three voice output modes:**
  - 🔇 **OFF** — Text responses only
  - 🔊 **SYSTEM** — Browser speech synthesis (instant)
  - 🗣️ **CLIFTON CLONE** — Your Voicebox cloned voice (~10-14 seconds per reply; synth time scales with reply length)

When clone voice is active, Jarvis automatically keeps replies to 1-2 sentences for snappy synthesis.

### System Telemetry

Real-time dashboard of your machine's vitals, updated every 2 seconds:
- **CPU Load** % with core count and speed
- **RAM Usage** with available/total
- **Disk Usage** with available/total
- **Network** (down/up speed and interface)
- **Uptime** in days/hours/minutes
- **Hardware** model name (e.g., Apple M4 Pro)

### Google Services Integration

**Calendar:** Today's events + next 3 upcoming  
**Gmail:** Unread count + 5 most recent email subjects  
**Drive:** 5 recent files + storage quota used/total  

Requires Google OAuth setup (see `SETUP.md` §2).

### Social Media Stats

Live stats for up to 4 platforms via SocialCrawl:
- **Instagram, Twitter/X, LinkedIn, Facebook**
- Follower counts, post counts, engagement rates
- Animated counters on load
- Falls back to demo data if API key or handle is missing

Requires SocialCrawl API key (see `SETUP.md` §3).

### Arc Reactor Visualization

The centerpiece of the dashboard — a spinning, glowing arc reactor core that reacts to Jarvis's voice:
- **Core pulses** — Size and brightness track real audio amplitude (when using Voicebox)
- **Waveform ring** — 24 white bars radiate and animate with speech
- **Spinning rings** — Throttle up 3× speed while Jarvis talks
- **Status line** — Flips from "STABLE" to "VOCAL OUTPUT ACTIVE" during speech

---

## 🏗️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, custom HUD CSS (scanlines, glitch effects, holographic borders)
- **AI:** @anthropic-ai/sdk, OpenAI SDK, OpenRouter API
- **System Monitoring:** systeminformation package
- **Google APIs:** googleapis library
- **Voice:** Voicebox (local TTS), Web Speech API (input)
- **Animations:** Framer Motion
- **Data Fetching:** SWR (stale-while-revalidate)
- **Fonts:** Orbitron (display), Space Mono (monospace) via Google Fonts

---

## 🔧 Environment Variables

### Required (pick at least one AI provider)
```bash
# Anthropic/Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6          # Optional, defaults to sonnet-4-6

# OpenAI/ChatGPT
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o                        # Optional, defaults to gpt-4o

# OpenRouter (any model)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4 # Optional, defaults to claude-sonnet-4
```

### Optional (Google services)
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

### Optional (Social stats)
```bash
SOCIALCRAWL_API_KEY=sc_...
SOCIAL_INSTAGRAM_HANDLE=yourhandle
SOCIAL_TWITTER_HANDLE=yourhandle
SOCIAL_LINKEDIN_HANDLE=yourhandle
SOCIAL_FACEBOOK_HANDLE=yourpage
```

### Optional (Voicebox local voice clone)
```bash
VOICEBOX_URL=http://127.0.0.1:8000         # Auto-discovered, override if needed
VOICEBOX_PROFILE_ID=...                    # Specific voice profile ID (defaults to first)
VOICEBOX_MODEL_SIZE=0.6B                   # 0.6B (fast) or 1.7B (quality), defaults to 0.6B
```

See `SETUP.md` for detailed setup instructions for each service.

---

## 📚 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── jarvis/          # Streaming AI chat with multi-provider support
│   │   ├── system/          # System telemetry (CPU, RAM, disk, network)
│   │   ├── calendar/        # Google Calendar integration
│   │   ├── gmail/           # Gmail API (unread count, recent messages)
│   │   ├── drive/           # Google Drive (recent files, storage)
│   │   ├── social/          # SocialCrawl (Instagram, Twitter, LinkedIn, Facebook)
│   │   ├── speak/           # Voicebox TTS proxy with auto-discovery
│   │   └── memory/          # Persistent memory (upcoming)
│   ├── globals.css          # HUD theme, animations, scanlines, glitch effects
│   ├── layout.tsx           # Root layout with fonts and metadata
│   └── page.tsx             # Main dashboard grid layout
└── components/
    ├── JarvisChat.tsx       # Chat interface with voice I/O
    ├── ArcReactor.tsx       # Animated reactor core (voice-reactive)
    ├── SystemStats.tsx      # Real-time system telemetry panel
    ├── GooglePanel.tsx      # Calendar, Gmail, Drive sections
    ├── SocialStats.tsx      # Social media stats with animated counters
    ├── HudPanel.tsx         # Reusable glowing panel wrapper
    └── ...
```

---

## 🗺️ Upcoming Features (Phases 1-7)

See `tasks/todo.md` for the complete roadmap. Currently planned:

1. **Weather + GitHub APIs** — Live weather briefing and GitHub PR/commit status
2. **Task Management** — Persistent todo list Jarvis can manage
3. **Live Context Injection** — Calendar, Gmail, GitHub, weather auto-injected into Jarvis's prompt
4. **Persistent Memory** — Conversations auto-save; Jarvis remembers previous sessions
5. **Web Search** — Jarvis can search the web in real-time (via SocialCrawl Tavily)
6. **File System Access** — Read-only access to your files and directories
7. **Task Tools** — Jarvis can create, complete, and list tasks directly

---

## 🎨 Design

**Visual Aesthetic:** Iron Man HUD inspired
- **Colors:** Dark navy (#000814), orange neon (#f66602), deep orange (#cc5200), white alerts
- **Effects:** Scanline overlay, holographic borders, glitch text animations, orange glow
- **Fonts:** Orbitron (display), Space Mono (monospace)
- **Layout:** 12-column CSS grid, responsive panels with corner brackets

All panels have glowing orange borders, pulsing animations, and corner bracket accents. The arc reactor is the visual centerpiece, reacting to Jarvis's speech.

---

## 🔐 Security & Privacy

- **No cloud storage** — All data (memory, tasks, conversations) stored locally in `~/.clifton-ai/`
- **Read-only Google APIs** — Calendar, Gmail, Drive integrations are read-only; no write permissions
- **Local voice synthesis** — Voice cloning happens locally via Voicebox; no voice data sent to third parties
- **Environment isolation** — API keys stored in `.env.local` (excluded from git)

---

## 📖 Setup Guides

Detailed setup instructions available in `SETUP.md`:
- §1 — AI Providers (Anthropic, OpenAI, OpenRouter)
- §2 — Google OAuth (Calendar, Gmail, Drive)
- §3 — SocialCrawl (social media stats)
- §4 — Voicebox (local voice clone)

---

## 🛠️ Development

### Build
```bash
npm run build
```

### Dev Server
```bash
npm run dev
```

### Lint
```bash
npm run lint
```

### Tech Stack Notes
- **Next.js 15** with App Router for server routes and static generation
- **TypeScript** for type safety across API routes and React components
- **Tailwind CSS v4** for utility-first styling
- **Custom CSS** for HUD effects (scanlines, glitch animations, glow effects)
- **SWR** for efficient data fetching with caching and revalidation
- **Framer Motion** for smooth panel animations on page load

---

## 🧠 How It Works

### Chat Flow
1. User sends message via chat input or voice
2. Message + last 20 messages sent to `/api/jarvis` with selected provider
3. Route streams response token-by-token using the chosen AI provider
4. Response displayed in chat, then:
   - **If voice OFF:** Done
   - **If voice SYSTEM:** Browser TTS reads reply instantly
   - **If voice CLIFTON CLONE:** Reply split into sentence chunks, first chunk sent to Voicebox, synthesized (~10-14s), played while remaining chunks generate in background

### System Updates
- System telemetry polls every 2s via `/api/system`
- Google services (calendar, Gmail, drive) poll every ~2-5 min (SWR revalidation)
- Social stats poll every 10 min
- All data independent from chat — panels update silently

### Voice Reaction
- When Voicebox audio plays, a Web Audio analyser feeds real frequency data to the arc reactor
- `voiceStore` (pub/sub) pushes amplitude level at 60fps
- Arc reactor core radius, glow, and waveform bars react in real-time
- Spinning rings throttle up during speech

---

## 📝 License

This project is created for personal use by Clifton Canady. Feel free to fork and adapt for your own needs.

---

## 🙋 Support

For setup help, see `SETUP.md`. For bugs or ideas, check `tasks/todo.md` for the roadmap.

---

**Built with ❤️ and a lot of orange neon glow.**
