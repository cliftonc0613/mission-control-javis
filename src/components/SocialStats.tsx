"use client";

import useSWR from "swr";
import HudPanel from "@/components/HudPanel";
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
  linkedin: "in",
  facebook: "f",
};

const LABELS: Record<string, string> = {
  instagram: "INSTAGRAM",
  twitter: "TWITTER / X",
  linkedin: "LINKEDIN",
  facebook: "FACEBOOK",
};

function SocialCard({ stat, delay }: { stat: SocialStat; delay: number }) {
  return (
    <HudPanel title={LABELS[stat.platform] ?? stat.platform} delay={delay}>
      <div className="flex items-start justify-between">
        <div className="text-2xl text-glow font-display w-8">
          {ICONS[stat.platform] ?? "◆"}
        </div>
        <span
          className={`text-[9px] tracking-widest ${
            stat.live ? "text-glow-white" : "text-hud-orange/40"
          }`}
        >
          {stat.live ? "● LIVE" : "○ DEMO"}
        </span>
      </div>

      <div className="mt-2 space-y-2 text-[11px]">
        <div>
          <div className="text-xl font-bold text-glow-white">
            <AnimatedCounter value={stat.followers} />
          </div>
          <div className="text-hud-orange/60 tracking-widest text-[9px]">
            FOLLOWERS
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-glow font-bold">
              <AnimatedCounter value={stat.posts} />
            </div>
            <div className="text-hud-orange/60 text-[9px] tracking-widest">
              POSTS
            </div>
          </div>
          <div>
            <div className="text-glow font-bold">
              <AnimatedCounter value={stat.engagement} suffix="%" decimals={1} />
            </div>
            <div className="text-hud-orange/60 text-[9px] tracking-widest">
              ENGAGEMENT
            </div>
          </div>
        </div>
      </div>
      {stat.error && (
        <p className="mt-2 text-[9px] text-hud-orange/40 truncate" title={stat.error}>
          ⚠ {stat.error}
        </p>
      )}
    </HudPanel>
  );
}

export default function SocialStats() {
  const { data } = useSWR<{ stats: SocialStat[] }>("/api/social", fetcher, {
    refreshInterval: 600000,
  });

  const stats = data?.stats ?? [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.length === 0
        ? Array.from({ length: 4 }).map((_, i) => (
            <HudPanel key={i} title="ACQUIRING" delay={0.5 + i * 0.1}>
              <p className="text-[10px] animate-pulse tracking-widest">
                SCANNING NETWORKS…
              </p>
            </HudPanel>
          ))
        : stats.map((s, i) => (
            <SocialCard key={s.platform} stat={s} delay={0.5 + i * 0.1} />
          ))}
    </div>
  );
}
