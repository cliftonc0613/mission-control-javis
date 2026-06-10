import HudPanel from "@/components/HudPanel";
import SystemStats from "@/components/SystemStats";
import ArcReactor from "@/components/ArcReactor";
import JarvisChat from "@/components/JarvisChat";
import HudClock from "@/components/HudClock";
import SocialStats from "@/components/SocialStats";
import {
  CalendarSection,
  GmailSection,
  DriveSection,
} from "@/components/GooglePanel";

export default function MissionControl() {
  return (
    <main className="min-h-screen p-4 lg:p-6 max-w-[1800px] mx-auto flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-hud-orange/30 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-hud-orange/60 text-xl">⟨</span>
          <h1
            className="glitch text-2xl lg:text-3xl font-black tracking-[0.3em] text-hud-orange"
            data-text="CLIFTON AI"
          >
            CLIFTON AI
          </h1>
          <span className="text-hud-orange/60 text-xl">⟩</span>
          <span className="hidden md:inline text-[10px] tracking-[0.4em] text-hud-orange/50 ml-4">
            MISSION CONTROL // J.A.R.V.I.S. ONLINE
          </span>
        </div>
        <HudClock />
      </header>

      {/* ── Main grid ──────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        {/* Left — System telemetry + social networks */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3 flex flex-col gap-4">
          <HudPanel title="System Telemetry" delay={0.1}>
            <SystemStats />
          </HudPanel>
          <HudPanel title="Social Networks" delay={0.25} className="flex-1">
            <SocialStats />
          </HudPanel>
        </div>

        {/* Center — Arc reactor + Jarvis */}
        <div className="col-span-12 md:col-span-9 lg:col-span-6">
          <HudPanel delay={0} className="h-full flex flex-col">
            {/* reactor is the centerpiece — fills the open space, centered */}
            <div className="flex-1 flex items-center justify-center py-2">
              <ArcReactor size={320} />
            </div>
            {/* chat anchored to the bottom of the panel */}
            <div className="flex flex-col mt-auto">
              <h2 className="hud-panel-title">Jarvis Interface</h2>
              <JarvisChat />
            </div>
          </HudPanel>
        </div>

        {/* Right — Google services */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <HudPanel title="Calendar" delay={0.2} className="flex-1">
            <CalendarSection />
          </HudPanel>
          <HudPanel title="Gmail" delay={0.3} className="flex-1">
            <GmailSection />
          </HudPanel>
          <HudPanel title="Drive" delay={0.4} className="flex-1">
            <DriveSection />
          </HudPanel>
        </div>
      </div>

      <footer className="text-center text-[9px] tracking-[0.4em] text-hud-orange/40 pb-2">
        CLIFTON AI MISSION CONTROL — ALL SYSTEMS NOMINAL
      </footer>
    </main>
  );
}
