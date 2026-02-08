interface OrnateBorderProps {
  thin?: boolean;
}

export function OrnateBorder({ thin = false }: OrnateBorderProps) {
  const inset = thin ? "12px" : "16px";
  const borderWidth = thin ? "1px" : "1.5px";
  const opacity = thin ? "0.25" : "0.35";
  const cornerSize = thin ? 20 : 30;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 hidden md:block">
      {/* Border lines */}
      <div
        className="absolute"
        style={{
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          border: `${borderWidth} solid rgba(212, 168, 67, ${opacity})`,
          borderRadius: "4px",
        }}
      />
      {/* Corner flourishes — 4 SVG L-shaped decorative corners */}
      {/* Top-left */}
      <svg
        className="absolute"
        style={{ top: `calc(${inset} - 4px)`, left: `calc(${inset} - 4px)` }}
        width={cornerSize}
        height={cornerSize}
        viewBox="0 0 30 30"
        fill="none"
      >
        <path d="M2 28 L2 8 Q2 2 8 2 L28 2" stroke="#d4a843" strokeWidth={thin ? "1" : "1.5"} opacity={opacity} strokeLinecap="round" />
        <circle cx="2" cy="28" r="2" fill="#d4a843" opacity={opacity} />
      </svg>
      {/* Top-right */}
      <svg
        className="absolute"
        style={{ top: `calc(${inset} - 4px)`, right: `calc(${inset} - 4px)` }}
        width={cornerSize}
        height={cornerSize}
        viewBox="0 0 30 30"
        fill="none"
      >
        <path d="M28 28 L28 8 Q28 2 22 2 L2 2" stroke="#d4a843" strokeWidth={thin ? "1" : "1.5"} opacity={opacity} strokeLinecap="round" />
        <circle cx="28" cy="28" r="2" fill="#d4a843" opacity={opacity} />
      </svg>
      {/* Bottom-left */}
      <svg
        className="absolute"
        style={{ bottom: `calc(${inset} - 4px)`, left: `calc(${inset} - 4px)` }}
        width={cornerSize}
        height={cornerSize}
        viewBox="0 0 30 30"
        fill="none"
      >
        <path d="M2 2 L2 22 Q2 28 8 28 L28 28" stroke="#d4a843" strokeWidth={thin ? "1" : "1.5"} opacity={opacity} strokeLinecap="round" />
        <circle cx="2" cy="2" r="2" fill="#d4a843" opacity={opacity} />
      </svg>
      {/* Bottom-right */}
      <svg
        className="absolute"
        style={{ bottom: `calc(${inset} - 4px)`, right: `calc(${inset} - 4px)` }}
        width={cornerSize}
        height={cornerSize}
        viewBox="0 0 30 30"
        fill="none"
      >
        <path d="M28 2 L28 22 Q28 28 22 28 L2 28" stroke="#d4a843" strokeWidth={thin ? "1" : "1.5"} opacity={opacity} strokeLinecap="round" />
        <circle cx="28" cy="2" r="2" fill="#d4a843" opacity={opacity} />
      </svg>
    </div>
  );
}
