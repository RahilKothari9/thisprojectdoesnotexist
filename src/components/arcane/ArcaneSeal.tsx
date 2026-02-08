import { cn } from "@/lib/utils";

interface ArcaneSealProps {
  size?: number;
  className?: string;
}

export function ArcaneSeal({ size = 100, className }: ArcaneSealProps) {
  const center = size / 2;
  const outerR = size / 2 - 4;
  const innerR = size / 2 - 16;
  const starR = size / 2 - 28;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;

  // Generate star points (5-pointed)
  const starPoints = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    return `${center + starR * Math.cos(angle)},${center + starR * Math.sin(angle)}`;
  });
  // Connect as pentagram: 0->2->4->1->3->0
  const pentagramOrder = [0, 2, 4, 1, 3, 0];
  const pentagramPath = pentagramOrder.map(i => starPoints[i]).join(" L ");
  const pentagramD = `M ${pentagramPath}`;

  return (
    <div className={cn("", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        {/* Outer circle */}
        <circle
          cx={center}
          cy={center}
          r={outerR}
          stroke="#d4a843"
          strokeWidth="2"
          opacity="0.6"
          strokeDasharray={outerCirc}
          strokeDashoffset={outerCirc}
          style={{ animation: "draw-sigil 1.5s ease-out forwards" }}
        />
        {/* Inner circle */}
        <circle
          cx={center}
          cy={center}
          r={innerR}
          stroke="#d4a843"
          strokeWidth="1.5"
          opacity="0.4"
          strokeDasharray={innerCirc}
          strokeDashoffset={innerCirc}
          style={{ animation: "draw-sigil 1.5s 0.3s ease-out forwards" }}
        />
        {/* Pentagram */}
        <path
          d={pentagramD}
          stroke="#d4a843"
          strokeWidth="1"
          opacity="0.35"
          strokeDasharray="500"
          strokeDashoffset="500"
          style={{ animation: "draw-sigil 1.5s 0.6s ease-out forwards" }}
        />
        {/* Cardinal dots */}
        {[0, 90, 180, 270].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = center + (outerR + innerR) / 2 * Math.cos(rad);
          const y = center + (outerR + innerR) / 2 * Math.sin(rad);
          return <circle key={angle} cx={x} cy={y} r="2.5" fill="#d4a843" opacity="0.5" />;
        })}
      </svg>
    </div>
  );
}
