"use client";

import { useEffect, useState } from "react";

export default function HudClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="text-[11px]">--:--:--</span>;

  return (
    <div className="text-right">
      <div className="text-[13px] text-glow-white font-bold tabular-nums">
        {now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      <div className="text-[9px] text-hud-orange/60 tracking-widest uppercase">
        {now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
