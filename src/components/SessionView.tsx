import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Power, Navigation, X } from "lucide-react";

interface SessionViewProps {
  projectName: string;
  visitedPages: string[];
  onEndSession: () => void;
  isLoading?: boolean;
  onReset?: () => void;
  pageCache: { [path: string]: string };
  sitePages: string[];
}

export function SessionView({ projectName, visitedPages, onEndSession, isLoading = false, onReset, pageCache, sitePages }: SessionViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleQuickNav = (path: string) => {
    if (pageCache[path]) {
      navigate(path);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl animate-[slide-up_0.4s_ease-out]">
        <div className="bg-[#0a1018]/95 backdrop-blur-md border border-[rgba(0,255,157,0.12)] rounded-xl overflow-hidden glow-box-green">

          {/* Expanded panel */}
          {isExpanded && (
            <div className="p-4 border-b border-[rgba(0,255,157,0.08)] animate-[fade-in_0.2s_ease-out] space-y-4">
              {/* Visited pages */}
              {visitedPages.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#4a6274] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3 h-3" />
                    visited ({visitedPages.length})
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

          {/* Main bar — page navigation chips */}
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

            {/* Page nav chips */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
              {sitePages.map(path => {
                const isReady = !!pageCache[path];
                const isActive = location.pathname === path;
                const label = path === '/' ? 'home' : path.replace('/', '');

                return (
                  <button
                    key={path}
                    onClick={() => handleQuickNav(path)}
                    disabled={!isReady}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30'
                        : isReady
                          ? 'bg-[#0f1923]/60 text-[#c8d6e5] border border-transparent hover:bg-[#0f1923] hover:border-[rgba(0,255,157,0.15)]'
                          : 'bg-[#0f1923]/30 text-[#4a6274]/40 border border-transparent cursor-not-allowed'
                    }`}
                  >
                    {!isReady && (
                      <span className="inline-block w-1 h-1 rounded-full bg-[#ffd700] animate-pulse mr-1.5 align-middle" />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
