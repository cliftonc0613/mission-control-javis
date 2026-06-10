"use client";

import useSWR from "swr";
import AnimatedCounter from "@/components/AnimatedCounter";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SocialStat {
  platform: string;
  handle: string;
  followers: number;
  posts: number;
  engagement: number;
  live: boolean;
  error?: string;
}

const ICONS: Record<string, string> = {
  instagram: "◉",
  twitter: "𝕏",
  facebook: "f",
};

const LABELS: Record<string, string> = {
  instagram: "INSTAGRAM",
  twitter: "TWITTER / X",
  facebook: "FACEBOOK",
};

function SocialRow({ stat }: { stat: SocialStat }) {
  return (
    <div className="border-b border-hud-orange/20 last:border-b-0 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base text-glow font-display w-5 text-center">
            {ICONS[stat.platform] ?? "◆"}
          </span>
          <span className="text-[10px] tracking-[0.25em] text-hud-orange/80 font-bold">
            {LABELS[stat.platform] ?? stat.platform}
          </span>
        </div>
        <span
          className={`text-[8px] tracking-widest ${
            stat.live ? "text-glow-white" : "text-hud-orange/40"
          }`}
          title={stat.error}
        >
          {stat.live ? "● LIVE" : "○ DEMO"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 pl-7">
        <div>
          <div className="text-sm font-bold text-glow-white leading-tight">
            <AnimatedCounter value={stat.followers} />
          </div>
          <div className="text-[8px] tracking-widest text-hud-orange/50">
            FOLLOWERS
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-glow leading-tight">
            <AnimatedCounter value={stat.posts} />
          </div>
          <div className="text-[8px] tracking-widest text-hud-orange/50">
            POSTS
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-glow leading-tight">
            <AnimatedCounter value={stat.engagement} suffix="%" decimals={1} />
          </div>
          <div className="text-[8px] tracking-widest text-hud-orange/50">
            ENGAGE
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SocialStats() {
  const { data } = useSWR<{ stats: SocialStat[] }>("/api/social", fetcher, {
    refreshInterval: 600000,
  });

  const stats = data?.stats ?? [];

  if (stats.length === 0) {
    return (
      <p className="text-[10px] animate-pulse tracking-widest">
        SCANNING NETWORKS…
      </p>
    );
  }

  return (
    <div>
      {stats.map((s) => (
        <SocialRow key={s.platform} stat={s} />
      ))}
    </div>
  );
}
