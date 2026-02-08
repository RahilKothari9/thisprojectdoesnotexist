import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, ChevronDown, ChevronUp, Power, Navigation, FileText } from "lucide-react";

interface SessionViewProps {
  projectName: string;
  visitedPages: string[];
  onEndSession: () => void;
  onInstructionsChange?: (instructions: string) => void;
  initialInstructions?: string;
  isLoading?: boolean;
  onReset?: () => void;
}

export function SessionView({ projectName, visitedPages, onEndSession, onInstructionsChange, initialInstructions = "", isLoading = false, onReset }: SessionViewProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState(initialInstructions);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToUrl = () => {
    if (customUrl.trim()) {
      const url = customUrl.startsWith('/') ? customUrl : `/${customUrl}`;
      navigate(url);
      setCustomUrl("");
    }
  };

  const handleQuickNav = (url: string) => {
    navigate(url);
  };

  const handleInstructionsChange = (value: string) => {
    setCustomInstructions(value);
    onInstructionsChange?.(value);
  };

  return (
    <>
      {/* Floating command bar - bottom of screen */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl animate-[slide-up_0.4s_ease-out]">
        <div className="bg-[#0a1018]/95 backdrop-blur-md border border-[rgba(0,255,157,0.12)] rounded-xl overflow-hidden glow-box-green">

          {/* Expanded panel */}
          {isExpanded && (
            <div className="p-4 border-b border-[rgba(0,255,157,0.08)] animate-[fade-in_0.2s_ease-out] space-y-4">
              {/* Instructions */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#4a6274] font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  instructions
                </label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => handleInstructionsChange(e.target.value)}
                  placeholder="guide the ai on how to generate pages..."
                  className="min-h-[60px] text-xs bg-[#0f1923]/60 border-[rgba(0,255,157,0.1)] text-[#c8d6e5] placeholder:text-[#4a6274]/40 focus:border-[#00ff9d]/30 resize-none font-mono"
                />
              </div>

              {/* Visited pages */}
              {visitedPages.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#4a6274] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3 h-3" />
                    pages ({visitedPages.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {visitedPages.map((page, index) => {
                      const isActive = location.pathname === page;
                      return (
                        <button
                          key={index}
                          onClick={() => handleQuickNav(page)}
                          className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all duration-200 ${
                            isActive
                              ? 'bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30'
                              : 'bg-[#0f1923]/60 text-[#4a6274] border border-transparent hover:text-[#c8d6e5] hover:bg-[#0f1923]'
                          }`}
                        >
                          {page === '/' ? '/' : page}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={onEndSession}
                  variant="outline"
                  size="sm"
                  className="text-xs font-mono bg-transparent border-[rgba(0,184,255,0.2)] text-[#00b8ff] hover:bg-[#00b8ff]/10 hover:border-[#00b8ff]/40"
                >
                  <Power className="w-3 h-3 mr-1.5" />
                  export & end
                </Button>
                {onReset && (
                  <Button
                    onClick={onReset}
                    variant="ghost"
                    size="sm"
                    className="text-xs font-mono text-[#4a6274] hover:text-[#ff3e3e] hover:bg-[#ff3e3e]/5"
                  >
                    <X className="w-3 h-3 mr-1.5" />
                    new project
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Main bar */}
          <div className="flex items-center gap-2 p-3">
            {/* Project indicator */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0f1923]/60 border border-[rgba(0,255,157,0.08)] hover:border-[rgba(0,255,157,0.2)] transition-all duration-200 shrink-0"
            >
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-[#ffd700] animate-pulse' : 'bg-[#00ff9d]'}`} />
              <span className="text-xs font-mono text-[#c8d6e5] max-w-[120px] truncate">{projectName}</span>
              {isExpanded ? <ChevronDown className="w-3 h-3 text-[#4a6274]" /> : <ChevronUp className="w-3 h-3 text-[#4a6274]" />}
            </button>

            {/* URL input */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00ff9d]/30 font-mono text-sm">/</span>
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="navigate to any path..."
                className="pl-6 h-9 text-sm bg-[#0f1923]/40 border-[rgba(0,255,157,0.08)] text-[#c8d6e5] placeholder:text-[#4a6274]/40 focus:border-[#00ff9d]/30 font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleNavigateToUrl()}
              />
            </div>

            {/* Navigate button */}
            <Button
              onClick={handleNavigateToUrl}
              size="sm"
              disabled={!customUrl.trim()}
              className="h-9 px-3 bg-[#00ff9d]/10 border border-[#00ff9d]/20 text-[#00ff9d] hover:bg-[#00ff9d]/20 disabled:opacity-20 transition-all duration-200"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
