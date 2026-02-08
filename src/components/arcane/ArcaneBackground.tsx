import { GoldParticles } from "./GoldParticles";
import { OrnateBorder } from "./OrnateBorder";

interface ArcaneBackgroundProps {
  children: React.ReactNode;
  thinBorder?: boolean;
  particleCount?: number;
}

export function ArcaneBackground({ children, thinBorder = false, particleCount = 10 }: ArcaneBackgroundProps) {
  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0612 70%)",
      }}
    >
      <GoldParticles count={particleCount} />
      <OrnateBorder thin={thinBorder} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
