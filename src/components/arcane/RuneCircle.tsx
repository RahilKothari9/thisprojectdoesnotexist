import { cn } from "@/lib/utils";

interface RuneCircleProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export function RuneCircle({ size = 80, animate = true, className }: RuneCircleProps) {
  const center = size / 2;
  const outerR = size / 2 - 4;
  const innerR = size / 2 - 14;
  const circumference = 2 * Math.PI * outerR;
  const innerCircumference = 2 * Math.PI * innerR;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className={animate ? "animate-[spin-slow_8s_linear_infinite]" : ""}
      >
        {/* Outer circle */}
        <circle
          cx={center}
          cy={center}
          r={outerR}
          stroke="#d4a843"
          strokeWidth="1.5"
          opacity="0.6"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? undefined : "0"}
          style={animate ? {
            animation: `draw-sigil 2s ease-out forwards`,
            strokeDashoffset: circumference,
          } : undefined}
        />
        {/* Inner circle */}
        <circle
          cx={center}
          cy={center}
          r={innerR}
          stroke="#d4a843"
          strokeWidth="1"
          opacity="0.3"
          strokeDasharray={innerCircumference}
          style={animate ? {
            animation: `draw-sigil 2s 0.5s ease-out forwards`,
            strokeDashoffset: innerCircumference,
          } : undefined}
        />
        {/* Radial lines (4 cardinal directions) */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = center + innerR * Math.cos(rad);
          const y1 = center + innerR * Math.sin(rad);
          const x2 = center + outerR * Math.cos(rad);
          const y2 = center + outerR * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#d4a843"
              strokeWidth="1"
              opacity="0.4"
            />
          );
        })}
        {/* Small dots at 45-degree positions */}
        {[45, 135, 225, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = center + (outerR + innerR) / 2 * Math.cos(rad);
          const y = center + (outerR + innerR) / 2 * Math.sin(rad);
          return (
            <circle
              key={angle}
              cx={x}
              cy={y}
              r="2"
              fill="#d4a843"
              opacity="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
}
