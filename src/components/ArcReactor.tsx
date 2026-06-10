"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { voiceStore } from "@/lib/voiceStore";

const BAR_COUNT = 24;

export default function ArcReactor({ size = 150 }: { size?: number }) {
  const speaking = useSyncExternalStore(
    voiceStore.subscribe,
    () => voiceStore.get().speaking,
    () => false
  );

  const glowRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const innerRef = useRef<SVGCircleElement>(null);
  const barsRef = useRef<SVGGElement>(null);

  // drive amplitude-reactive parts directly via rAF (no React re-renders)
  useEffect(() => {
    let raf = 0;
    let t = 0;
    let smoothed = 0;

    const tick = () => {
      const { level, speaking } = voiceStore.get();
      t += 0.12;
      // smooth the level so the core breathes instead of stuttering
      smoothed += ((speaking ? level : 0) - smoothed) * 0.25;

      if (coreRef.current) {
        coreRef.current.setAttribute("r", String(14 + smoothed * 8));
      }
      if (innerRef.current) {
        innerRef.current.setAttribute("r", String(7 + smoothed * 4));
      }
      if (glowRef.current) {
        glowRef.current.style.opacity = String(0.7 + smoothed * 0.3);
        glowRef.current.style.transform = `scale(${1 + smoothed * 0.25})`;
      }
      if (barsRef.current) {
        barsRef.current.style.opacity = String(Math.min(1, smoothed * 3));
        const bars = barsRef.current.children;
        for (let i = 0; i < bars.length; i++) {
          const wobble = 0.55 + 0.45 * Math.sin(t * 2 + i * 1.7);
          const h = 3 + smoothed * 16 * wobble;
          (bars[i] as SVGLineElement).setAttribute("y2", String(-(20 + h)));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={speaking ? "reactor-talking" : ""}>
      <div
        className="relative mx-auto"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* ambient glow */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-full reactor-core transition-opacity"
          style={{
            background:
              "radial-gradient(circle, rgba(246,102,2,0.5) 0%, rgba(246,102,2,0.12) 45%, transparent 70%)",
            filter: "blur(6px)",
          }}
        />
        <svg viewBox="0 0 200 200" className="relative w-full h-full">
          {/* outer ring */}
          <circle cx="100" cy="100" r="96" fill="none" stroke="#cc5200" strokeWidth="1.5" opacity="0.5" />
          <circle cx="100" cy="100" r="90" fill="none" stroke="#f66602" strokeWidth="0.75" opacity="0.35" strokeDasharray="4 6" />

          {/* segmented outer ring — slow spin */}
          <g className="reactor-spin">
            {Array.from({ length: 10 }).map((_, i) => (
              <rect
                key={i}
                x="94"
                y="8"
                width="12"
                height="20"
                rx="2"
                fill="#f66602"
                opacity="0.85"
                transform={`rotate(${i * 36} 100 100)`}
              />
            ))}
          </g>

          {/* mid ring — reverse spin */}
          <g className="reactor-spin-reverse">
            <circle cx="100" cy="100" r="62" fill="none" stroke="#f66602" strokeWidth="2" strokeDasharray="30 18" opacity="0.9" />
            {Array.from({ length: 3 }).map((_, i) => (
              <line
                key={i}
                x1="100"
                y1="44"
                x2="100"
                y2="56"
                stroke="#ffffff"
                strokeWidth="2"
                opacity="0.8"
                transform={`rotate(${i * 120} 100 100)`}
              />
            ))}
          </g>

          {/* inner ring — fast spin */}
          <g className="reactor-spin-fast">
            <circle cx="100" cy="100" r="44" fill="none" stroke="#cc5200" strokeWidth="6" strokeDasharray="12 9" opacity="0.9" />
          </g>

          {/* voice waveform bars — light up while Jarvis talks */}
          <g ref={barsRef} style={{ opacity: 0 }}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1="-20"
                x2="0"
                y2="-23"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.9"
                transform={`translate(100 100) rotate(${(i * 360) / BAR_COUNT})`}
                style={{ filter: "drop-shadow(0 0 3px #f66602)" }}
              />
            ))}
          </g>

          {/* triangle core housing */}
          <circle cx="100" cy="100" r="32" fill="rgba(246,102,2,0.08)" stroke="#f66602" strokeWidth="1" />
          <polygon
            points="100,72 124,114 76,114"
            fill="none"
            stroke="#f66602"
            strokeWidth="2.5"
            className="reactor-core"
            style={{ filter: "drop-shadow(0 0 6px #f66602)" }}
          />

          {/* core — radius pulses with live audio amplitude */}
          <circle
            ref={coreRef}
            cx="100"
            cy="100"
            r="14"
            fill="#f66602"
            className="reactor-core"
            style={{ filter: "drop-shadow(0 0 14px #f66602)" }}
          />
          <circle ref={innerRef} cx="100" cy="100" r="7" fill="#ffffff" opacity="0.95" className="reactor-core" />
        </svg>
      </div>
      <div className="text-center text-[9px] tracking-[0.5em] text-hud-orange/50 mt-1 mb-3">
        {speaking ? (
          <span className="text-glow-white">ARC REACTOR — VOCAL OUTPUT ACTIVE</span>
        ) : (
          "ARC REACTOR CORE — STABLE"
        )}
      </div>
    </div>
  );
}
