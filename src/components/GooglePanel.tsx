"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CalendarEvent {
  title: string;
  start: string | null;
  allDay: boolean;
  location: string | null;
}

function Offline({ message }: { message?: string }) {
  return (
    <p className="text-[10px] text-hud-orange/50 italic">
      {message ?? "LINK OFFLINE — credentials required (SETUP.md)"}
    </p>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function eventTime(e: CalendarEvent): string {
  if (e.allDay || !e.start) return "ALL DAY";
  return new Date(e.start).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalendarSection() {
  const { data } = useSWR("/api/calendar", fetcher, { refreshInterval: 300000 });

  if (!data) return <p className="text-[10px] animate-pulse">SYNCING…</p>;
  if (!data.configured || data.error) return <Offline message={data.error} />;

  const today: CalendarEvent[] = data.today ?? [];
  const upcoming: CalendarEvent[] = data.upcoming ?? [];

  return (
    <div className="text-[11px] space-y-1">
      {today.length === 0 && (
        <p className="text-hud-orange/60">NO REMAINING EVENTS TODAY</p>
      )}
      {today.map((e, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-glow-white shrink-0">{eventTime(e)}</span>
          <span className="truncate text-hud-orange/90">{e.title}</span>
        </div>
      ))}
      {upcoming.length > 0 && (
        <>
          <div className="text-[9px] tracking-widest text-hud-orange/50 pt-1">
            ── UPCOMING ──
          </div>
          {upcoming.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-hud-orange/60 shrink-0">
                {e.start
                  ? new Date(e.start).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </span>
              <span className="truncate text-hud-orange/80">{e.title}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function GmailSection() {
  const { data } = useSWR("/api/gmail", fetcher, { refreshInterval: 120000 });

  if (!data) return <p className="text-[10px] animate-pulse">SYNCING…</p>;
  if (!data.configured || data.error) return <Offline message={data.error} />;

  return (
    <div className="text-[11px] space-y-1">
      <div className="mb-2">
        <span className="text-glow-white text-lg font-bold">
          {data.unreadCount}
        </span>{" "}
        <span className="text-hud-orange/70 tracking-widest text-[10px]">
          UNREAD
        </span>
      </div>
      {(data.messages ?? []).map(
        (m: { subject: string; from: string; unread: boolean }, i: number) => (
          <div key={i} className="truncate">
            <span className={m.unread ? "text-glow-white" : "text-hud-orange/60"}>
              {m.unread ? "●" : "○"}
            </span>{" "}
            <span className="text-hud-orange/90">{m.subject}</span>{" "}
            <span className="text-hud-orange/50">— {m.from}</span>
          </div>
        )
      )}
    </div>
  );
}

export function DriveSection() {
  const { data } = useSWR("/api/drive", fetcher, { refreshInterval: 300000 });

  if (!data) return <p className="text-[10px] animate-pulse">SYNCING…</p>;
  if (!data.configured || data.error) return <Offline message={data.error} />;

  const { used, total } = data.storage ?? { used: 0, total: 0 };
  const percent = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className="text-[11px] space-y-1">
      {(data.files ?? []).map((f: { name: string }, i: number) => (
        <div key={i} className="truncate text-hud-orange/90">
          ▸ {f.name}
        </div>
      ))}
      <div className="pt-2">
        <div className="hud-bar-track">
          <div className="hud-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="text-[10px] text-hud-orange/60 mt-1">
          {formatBytes(used)} / {total > 0 ? formatBytes(total) : "∞"}
        </div>
      </div>
    </div>
  );
}
