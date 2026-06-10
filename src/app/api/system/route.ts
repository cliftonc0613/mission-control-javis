import { NextResponse } from "next/server";
import si from "systeminformation";

export const dynamic = "force-dynamic";

export interface SystemStatsPayload {
  cpu: { load: number; cores: number; model: string; speed: number };
  ram: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
  network: { rx: number; tx: number; iface: string };
  uptime: number;
}

async function getStats(): Promise<SystemStatsPayload> {
  const [load, mem, fs, net, cpu, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.cpu(),
    Promise.resolve(si.time()),
  ]);

  const mainDisk = fs.reduce(
    (acc, d) => ({ used: acc.used + d.used, total: acc.total + d.size }),
    { used: 0, total: 0 }
  );
  const mainNet = net[0];
  // macOS: "available" memory accounts for cached/compressed pages
  const ramUsed = mem.total - mem.available;

  return {
    cpu: {
      load: Math.round(load.currentLoad * 10) / 10,
      cores: cpu.cores,
      model: `${cpu.manufacturer} ${cpu.brand}`.trim(),
      speed: cpu.speed,
    },
    ram: {
      used: ramUsed,
      total: mem.total,
      percent: Math.round((ramUsed / mem.total) * 1000) / 10,
    },
    disk: {
      used: mainDisk.used,
      total: mainDisk.total,
      percent:
        mainDisk.total > 0
          ? Math.round((mainDisk.used / mainDisk.total) * 1000) / 10
          : 0,
    },
    network: {
      rx: mainNet?.rx_sec ?? 0,
      tx: mainNet?.tx_sec ?? 0,
      iface: mainNet?.iface ?? "—",
    },
    uptime: time.uptime,
  };
}

export async function POST() {
  try {
    return NextResponse.json(await getStats());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "system telemetry failure" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
