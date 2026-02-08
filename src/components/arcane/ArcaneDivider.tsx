import { cn } from "@/lib/utils";

interface ArcaneDividerProps {
  className?: string;
}

export function ArcaneDivider({ className }: ArcaneDividerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg width="200" height="20" viewBox="0 0 200 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="10" x2="80" y2="10" stroke="#d4a843" strokeWidth="1" opacity="0.4" />
        <polygon points="100,2 108,10 100,18 92,10" fill="#d4a843" opacity="0.6" />
        <line x1="120" y1="10" x2="200" y2="10" stroke="#d4a843" strokeWidth="1" opacity="0.4" />
        {/* Small dots flanking the diamond */}
        <circle cx="85" cy="10" r="1.5" fill="#d4a843" opacity="0.3" />
        <circle cx="115" cy="10" r="1.5" fill="#d4a843" opacity="0.3" />
      </svg>
    </div>
  );
}
