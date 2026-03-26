import { useState, useRef } from "react";

interface RateLimitBucket {
  limit: number;
  remaining: number;
  reset: number;
}

interface ProviderUsage {
  requestsPerDay: RateLimitBucket;
  tokensPerMinute: RateLimitBucket;
}

interface ProviderInfo {
  id: string;
  name: string;
  model: string;
  available: boolean;
  usage: ProviderUsage | null;
}

interface ProviderToggleProps {
  activeProvider: string;
  onProviderChange: (id: string) => void;
  providerUsage: Record<string, ProviderInfo>;
}

export function ProviderToggle({ activeProvider, onProviderChange, providerUsage }: ProviderToggleProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipTimeout = useRef<number | null>(null);

  const providers = ['gemini', 'cerebras'] as const;

  const showTooltip = (text: string) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltip(text);
  };

  const hideTooltip = () => {
    tooltipTimeout.current = window.setTimeout(() => setTooltip(null), 200);
  };

  const isExhausted = (info: ProviderInfo | undefined): boolean => {
    if (!info?.available) return true;
    if (!info.usage) return false; // no usage data = assume available (Gemini)
    return info.usage.requestsPerDay.remaining <= 0;
  };

  const getUsagePercent = (info: ProviderInfo | undefined): number | null => {
    if (!info?.usage) return null;
    const { limit, remaining } = info.usage.requestsPerDay;
    if (limit === 0) return 0;
    return Math.round(((limit - remaining) / limit) * 100);
  };

  return (
    <div className="flex items-center gap-1 relative">
      {providers.map(id => {
        const info = providerUsage[id];
        const exhausted = isExhausted(info);
        const isActive = activeProvider === id;
        const usagePercent = getUsagePercent(info);
        const label = id === 'gemini' ? 'Gemini' : 'Cerebras';

        return (
          <button
            key={id}
            onClick={() => !exhausted && onProviderChange(id)}
            onMouseEnter={() => {
              if (exhausted) showTooltip(`${label}: limit exceeded`);
              else if (usagePercent !== null) showTooltip(`${label}: ${usagePercent}% used`);
            }}
            onMouseLeave={hideTooltip}
            disabled={exhausted}
            className={`relative px-2.5 py-1 text-[10px] font-mono rounded-md transition-all duration-200 overflow-hidden ${
              exhausted
                ? 'bg-[#0f1923]/30 text-[#4a6274]/30 cursor-not-allowed border border-transparent'
                : isActive
                  ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30'
                  : 'bg-[#0f1923]/60 text-[#4a6274] border border-transparent hover:text-[#c8d6e5] hover:bg-[#0f1923]'
            }`}
          >
            {/* Usage bar background */}
            {usagePercent !== null && !exhausted && (
              <div
                className="absolute bottom-0 left-0 h-[2px] transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent > 80
                    ? 'rgba(255,62,62,0.6)'
                    : usagePercent > 50
                      ? 'rgba(255,215,0,0.5)'
                      : 'rgba(0,255,157,0.3)',
                }}
              />
            )}
            {label}
          </button>
        );
      })}

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-mono text-[#c8d6e5] bg-[#0a1018] border border-[rgba(0,255,157,0.15)] rounded whitespace-nowrap z-50 animate-[fade-in_0.15s_ease-out]">
          {tooltip}
        </div>
      )}
    </div>
  );
}
