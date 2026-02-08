import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, BookX } from "lucide-react";

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
    <div className="fixed left-0 top-0 h-full w-80 bg-[#1e1233]/95 backdrop-blur-sm border-r border-[rgba(212,168,67,0.15)] p-4 overflow-y-auto z-20">
      <div className="space-y-5">

        {/* Chapter Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="font-cinzel text-lg font-bold text-[#f0c75e] truncate max-w-[200px]">{projectName}</h2>
              {isLoading && (
                <div className="w-3.5 h-3.5 border-2 border-[#2a1845] border-t-[#d4a843] rounded-full animate-spin"></div>
              )}
            </div>
            {onReset && (
              <Button
                onClick={onReset}
                variant="ghost"
                size="sm"
                className="text-[#9a8c7a] hover:text-[#d4a843] hover:bg-[#2a1845] px-2 py-1 h-auto text-xs"
                title="Start New Project"
              >
                Reset
              </Button>
            )}
          </div>
          {/* Gold underline flourish */}
          <div className="h-px bg-gradient-to-r from-[#d4a843]/60 via-[#d4a843]/20 to-transparent mb-1"></div>
          <p className="text-xs rune-label text-[#9a8c7a]">
            {isLoading ? 'Summoning...' : 'Conjuration Active'}
          </p>
        </div>

        {/* Conjuration Path */}
        <Card className="bg-[#2a1845]/40 border-[rgba(139,92,246,0.15)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs rune-label text-[#e8dcc8]">Conjuration Path</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex space-x-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="/enter-a-path"
                className="bg-[#1e1233]/80 border-[rgba(139,92,246,0.2)] text-[#e8dcc8] placeholder:text-[#9a8c7a]/50 text-sm focus:border-[#d4a843] focus:shadow-[0_0_8px_rgba(212,168,67,0.15)] transition-all duration-300"
                onKeyDown={(e) => e.key === 'Enter' && handleNavigateToUrl()}
              />
              <Button
                onClick={handleNavigateToUrl}
                size="sm"
                className="bg-[#d4a843]/20 border border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/30 hover:shadow-[0_0_10px_rgba(212,168,67,0.2)] transition-all duration-300 px-2.5"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-[#9a8c7a] leading-relaxed">
              Enter any path to conjure a new page...
            </p>
          </CardContent>
        </Card>

        {/* Enchantment Notes */}
        <Card className="bg-[#2a1845]/40 border-[rgba(139,92,246,0.15)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs rune-label text-[#e8dcc8]">Enchantment Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={customInstructions}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              placeholder="Scribe your enchantment notes here..."
              className="bg-[#1e1233]/80 border-[rgba(139,92,246,0.2)] text-[#e8dcc8] placeholder:text-[#9a8c7a]/50 text-sm min-h-[70px] resize-none focus:border-[#d4a843] focus:shadow-[0_0_8px_rgba(212,168,67,0.15)] transition-all duration-300"
            />
            <p className="text-[10px] text-[#9a8c7a]">
              These notes guide the conjuration of new pages
            </p>
          </CardContent>
        </Card>

        {/* Summoned Pages */}
        {visitedPages.length > 0 && (
          <Card className="bg-[#2a1845]/40 border-[rgba(139,92,246,0.15)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs rune-label text-[#e8dcc8]">
                Summoned Pages ({visitedPages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {visitedPages.map((page, index) => {
                  const isActive = location.pathname === page;
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickNav(page)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition-all duration-300 flex items-center gap-2 ${
                        isActive
                          ? 'text-[#f0c75e] bg-[#d4a843]/10 shadow-[0_0_8px_rgba(212,168,67,0.1)]'
                          : 'text-[#9a8c7a] hover:text-[#e8dcc8] hover:bg-[#2a1845]/60'
                      }`}
                    >
                      <span className={`text-[8px] ${isActive ? 'text-[#d4a843]' : 'text-[#9a8c7a]/40'}`}>◆</span>
                      <span className="font-mono">{page === '/' ? '/ (home)' : page}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seal the Grimoire */}
        <div className="pt-3">
          <Button
            onClick={onEndSession}
            variant="outline"
            className="w-full bg-[#7c3aed]/10 border-[#7c3aed]/30 text-[#8b5cf6] hover:bg-[#7c3aed]/20 hover:border-[#7c3aed]/50 transition-all duration-300"
          >
            <BookX className="w-4 h-4 mr-2" />
            Seal the Grimoire
          </Button>
        </div>
      </div>
    </div>
  );
}
