# JARVIS Intelligence Upgrades — Task Checklist

## Phase 1: Weather + GitHub APIs (Simple Dashboard Additions)

- [ ] **Create GitHub API route** (`src/app/api/github/route.ts`)
  - [ ] GitHub REST API integration with `GITHUB_TOKEN`
  - [ ] Return: open PRs, last 5 commits, open issues
  - [ ] Env vars: `GITHUB_TOKEN`, `GITHUB_USERNAME`

- [ ] **Create Weather API route** (`src/app/api/weather/route.ts`)
  - [ ] wttr.in integration (no API key needed) or OpenWeatherMap
  - [ ] Return: temp, condition, high/low, precipitation
  - [ ] Env vars: `WEATHER_LOCATION` (e.g. "Nashville,TN")

- [ ] **Create GitHub Panel component** (`src/components/GitHubPanel.tsx`)
  - [ ] HUD-styled display for PRs, commits, issues
  - [ ] Integrate with right-column panel layout

- [ ] **Create Weather Widget component** (`src/components/WeatherWidget.tsx`)
  - [ ] Small widget for dashboard header or right panel
  - [ ] Display temp, condition, forecast

- [ ] **Update page layout** (`src/app/page.tsx`)
  - [ ] Add GitHubPanel to right column
  - [ ] Add WeatherWidget to header area

- [ ] **Update env example** (`.env.local.example`)
  - [ ] Add `GITHUB_TOKEN`, `GITHUB_USERNAME`
  - [ ] Add `WEATHER_LOCATION`, optional `OPENWEATHER_API_KEY`

---

## Phase 2: Task / Todo Management (Pure CRUD Panel)

- [ ] **Create Tasks API route** (`src/app/api/tasks/route.ts`)
  - [ ] CRUD endpoints: `GET|POST|PATCH|DELETE /api/tasks`
  - [ ] Store in `~/.clifton-ai/tasks.json`
  - [ ] Task schema: `{ id, title, due?, priority?, completed, createdAt }`
  - [ ] Path validation & auto-create `.clifton-ai/` directory

- [ ] **Create TaskPanel component** (`src/components/TaskPanel.tsx`)
  - [ ] List tasks with checkbox for completion
  - [ ] Priority badge styling
  - [ ] Quick-entry form to add tasks
  - [ ] HUD-style design consistency

- [ ] **Integrate TaskPanel into page** (`src/app/page.tsx`)
  - [ ] Add to right column (bottom) or dedicated row above social stats

---

## Phase 3: Live Context Injection (Connect All Data to Jarvis Brain)

- [ ] **Create Context aggregation API** (`src/app/api/context/route.ts`)
  - [ ] `GET /api/context` aggregates in one call:
    - [ ] Calendar events (from existing `/api/calendar`)
    - [ ] Gmail unread count (from existing `/api/gmail`)
    - [ ] Weather (from Phase 1 `/api/weather`)
    - [ ] Tasks (from Phase 2 `/api/tasks`)
    - [ ] System load (from existing `/api/system`)
    - [ ] GitHub status (from Phase 1 `/api/github`)

- [ ] **Update Jarvis route** (`src/app/api/jarvis/route.ts`)
  - [ ] Fetch `/api/context` on each POST request
  - [ ] Format context block with "CURRENT STATUS" header
  - [ ] Prepend to system prompt before API call
  - [ ] Include last N hours timestamp

- [ ] **Test Jarvis awareness**
  - [ ] Verify system prompt includes all context
  - [ ] Check Jarvis can reference calendar, tasks, GitHub

---

## Phase 4: Persistent Memory (Conversation Auto-Save)

- [ ] **Create Memory API route** (`src/app/api/memory/route.ts`)
  - [ ] `GET|POST /api/memory` for CRUD
  - [ ] File: `~/.clifton-ai/memory.json`
  - [ ] Schema: `{ pinnedFacts: [...], sessions: [{date, summary, messages}] }`
  - [ ] Create directory if missing

- [ ] **Update JarvisChat component** (`src/components/JarvisChat.tsx`)
  - [ ] On mount: load last 3 sessions + pinned facts
  - [ ] On each assistant reply: auto-save (debounced 5s)
  - [ ] Add "📌 Pin this" button for highlighted text
  - [ ] Store pinned facts to memory API

- [ ] **Create Memory panel widget** (right column or modal)
  - [ ] Display last session summary
  - [ ] Show pinned facts
  - [ ] Allow manual fact editing/deletion

- [ ] **Update system prompt** (`src/app/api/jarvis/route.ts`)
  - [ ] Inject last 3 session summaries at startup
  - [ ] Include all pinned facts in context

---

## Phase 5: Web Search Tool (Tool-Use Loop)

- [ ] **Create Search API route** (`src/app/api/search/route.ts`)
  - [ ] Proxy to SocialCrawl Tavily endpoint
  - [ ] Validate queries, return results with sources

- [ ] **Refactor Jarvis streaming for tool use** (`src/app/api/jarvis/route.ts`)
  - [ ] **Anthropic**: Add `search_web` tool definition + tool-use loop
    - [ ] Stream normally, intercept tool calls
    - [ ] Execute `/api/search`, inject results
    - [ ] Continue streaming response
  - [ ] **OpenAI**: Same pattern with `function_calling`
  - [ ] **OpenRouter**: Wrap in compatibility layer if needed

- [ ] **Update system prompt**
  - [ ] Document available tools (search_web)
  - [ ] Instruct Jarvis when/how to use them

- [ ] **Test tool use**
  - [ ] Ask Jarvis a research question → verify search API called
  - [ ] Check results injected into response
  - [ ] Validate source attribution

---

## Phase 6: File System Access Tool (Depends on Phase 5)

- [ ] **Create Filesystem API route** (`src/app/api/filesystem/route.ts`)
  - [ ] `POST /api/filesystem` with `{ action: "list"|"read", path }`
  - [ ] Path validation: must be under `$HOME`, no dotfiles
  - [ ] Return directory listing or file content (max 50KB, text only)

- [ ] **Add filesystem tools to Jarvis** (`src/app/api/jarvis/route.ts`)
  - [ ] Tool defs: `read_file(path)`, `list_directory(path)`
  - [ ] Integrate into tool-use loop from Phase 5

- [ ] **Test filesystem access**
  - [ ] Ask "what's in my Downloads?" → list files
  - [ ] Ask "show me the contents of foo.txt" → read file

---

## Phase 7: Task Tools for Jarvis (Depends on Phase 5)

- [ ] **Add task tools to Jarvis** (`src/app/api/jarvis/route.ts`)
  - [ ] Tool defs: `add_task(title, due_date?)`, `complete_task(id)`, `list_tasks()`
  - [ ] Integrate into tool-use loop from Phase 5

- [ ] **Test task tool use**
  - [ ] Chat: "Add a task: finish dashboard by Friday" → task appears
  - [ ] Chat: "Mark the dashboard task complete" → task checked
  - [ ] Chat: "Show me my tasks" → Jarvis lists them

---

## Integration & Testing

- [ ] **Build & type check**
  - [ ] `npm run build` passes with no TypeScript errors
  - [ ] No console warnings in dev mode

- [ ] **End-to-end verification**
  - [ ] [ ] Reload dashboard → GitHub + weather panels visible
  - [ ] [ ] Open Jarvis chat → system prompt includes current status
  - [ ] [ ] Add task via chat → appears in TaskPanel
  - [ ] [ ] Ask Jarvis a question → sees search tool available
  - [ ] [ ] Ask "what files are in X?" → lists them
  - [ ] [ ] Reload page → Jarvis greets with memory of last session
  - [ ] [ ] Pin a fact in chat → appears in memory panel

- [ ] **Git commits** (after each phase)
  - [ ] [ ] Phase 1 complete
  - [ ] [ ] Phase 2 complete
  - [ ] [ ] Phase 3 complete
  - [ ] [ ] Phase 4 complete
  - [ ] [ ] Phase 5 complete
  - [ ] [ ] Phase 6 complete
  - [ ] [ ] Phase 7 complete
