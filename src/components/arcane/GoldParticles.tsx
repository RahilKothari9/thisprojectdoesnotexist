import { useMemo, useState, useEffect } from "react";

interface GoldParticlesProps {
  count?: number;
  className?: string;
}

export function GoldParticles({ count = 10, className = "" }: GoldParticlesProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const effectiveCount = isMobile ? Math.min(count, 5) : count;

  const particles = useMemo(() => {
    return Array.from({ length: effectiveCount }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      size: 2 + Math.random() * 2,
      duration: `${8 + Math.random() * 7}s`,
      delay: `${Math.random() * 10}s`,
      opacity: 0.15 + Math.random() * 0.25,
    }));
  }, [effectiveCount]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: "#d4a843",
            opacity: p.opacity,
            animation: `float-up ${p.duration} ${p.delay} linear infinite`,
          }}
        />
      ))}
    </div>
  );
}
