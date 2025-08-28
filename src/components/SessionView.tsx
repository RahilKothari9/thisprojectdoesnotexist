import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <div className="fixed left-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur border-r border-slate-700 p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Project Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{projectName}</h2>
              {isLoading && (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin"></div>
              )}
            </div>
            {onReset && (
              <Button
                onClick={onReset}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700 px-2 py-1 h-auto text-xs"
                title="Start New Project"
              >
                Reset
              </Button>
            )}
          </div>
          <p className="text-sm text-slate-400">
            {isLoading ? 'Generating page...' : 'Ideation Session'}
          </p>
        </div>

        {/* URL Navigation */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-200">Navigate to URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex space-x-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="/your-page"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleNavigateToUrl()}
              />
              <Button
                onClick={handleNavigateToUrl}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go
              </Button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter any path (e.g., /about, /pricing, /contact) to generate a new page. 
              The LLM will create content matching your project's style and navigation.
            </p>
          </CardContent>
        </Card>

        {/* Custom Instructions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-200">Page Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={customInstructions}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              placeholder="Add specific instructions for page generation..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 text-sm min-h-[80px] resize-none"
            />
            <p className="text-xs text-slate-500">
              These instructions will be used when generating new pages
            </p>
          </CardContent>
        </Card>

        {/* Visited Pages */}
        {visitedPages.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-200">
                Visited Pages ({visitedPages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {visitedPages.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickNav(page)}
                    className="w-full text-left px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    {page === '/' ? '/ (home)' : page}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* End Session */}
        <div className="pt-4">
          <Button
            onClick={onEndSession}
            variant="outline"
            className="w-full bg-red-900/20 border-red-800 text-red-300 hover:bg-red-900/30 hover:border-red-700"
          >
            End Session & Export
          </Button>
        </div>
      </div>
    </div>
  );
}
