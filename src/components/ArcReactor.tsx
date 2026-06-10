"use client";

export default function ArcReactor({ size = 180 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* ambient glow */}
      <div
        className="absolute inset-0 rounded-full reactor-core"
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

        {/* core */}
        <circle
          cx="100"
          cy="100"
          r="14"
          fill="#f66602"
          className="reactor-core"
          style={{ filter: "drop-shadow(0 0 14px #f66602)" }}
        />
        <circle cx="100" cy="100" r="7" fill="#ffffff" opacity="0.95" className="reactor-core" />
      </svg>
    </div>
  );
}
