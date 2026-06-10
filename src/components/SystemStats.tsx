"use client";

import useSWR from "swr";
import type { SystemStatsPayload } from "@/app/api/system/route";

const fetcher = (url: string) =>
  fetch(url, { method: "POST" }).then((r) => r.json());

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function StatBar({
  label,
  percent,
  detail,
}: {
  label: string;
  percent: number;
  detail: string;
}) {
  const critical = percent > 90;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-glow font-bold tracking-widest">{label}</span>
        <span className={critical ? "text-glow-white" : "text-hud-orange/80"}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="hud-bar-track">
        <div className="hud-bar-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="text-[10px] text-hud-orange/60 mt-1">{detail}</div>
    </div>
  );
}

export default function SystemStats() {
  const { data, error } = useSWR<SystemStatsPayload>("/api/system", fetcher, {
    refreshInterval: 2000,
  });

  if (error)
    return <p className="text-glow-white text-xs">TELEMETRY LINK FAILURE</p>;
  if (!data)
    return (
      <p className="text-xs animate-pulse tracking-widest">
        INITIALIZING SENSORS…
      </p>
    );

  return (
    <div>
      <StatBar
        label="CPU"
        percent={data.cpu.load}
        detail={`${data.cpu.cores} CORES @ ${data.cpu.speed}GHz`}
      />
      <StatBar
        label="RAM"
        percent={data.ram.percent}
        detail={`${formatBytes(data.ram.used)} / ${formatBytes(data.ram.total)}`}
      />
      <StatBar
        label="DISK"
        percent={data.disk.percent}
        detail={`${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}`}
      />

      <div className="border-t border-hud-orange/30 pt-3 mt-2">
        <div className="text-[11px] font-bold tracking-widest text-glow mb-2">
          NETWORK <span className="text-hud-orange/50">[{data.network.iface}]</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-hud-orange/60">▼ DOWN</span>
            <div className="text-glow-white">{formatSpeed(data.network.rx)}</div>
          </div>
          <div>
            <span className="text-hud-orange/60">▲ UP</span>
            <div className="text-glow-white">{formatSpeed(data.network.tx)}</div>
          </div>
        </div>
      </div>

      <div className="border-t border-hud-orange/30 pt-3 mt-3 text-[10px] text-hud-orange/60">
        UPTIME: <span className="text-hud-orange">{formatUptime(data.uptime)}</span>
        <div className="mt-1 truncate" title={data.cpu.model}>
          {data.cpu.model}
        </div>
      </div>
    </div>
  );
}
