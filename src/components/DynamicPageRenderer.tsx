import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SessionView } from "./SessionView";
import { ProviderToggle } from "./ProviderToggle";

interface ProjectConfig {
  name: string;
  instructions: string;
}

interface DynamicPageRendererProps {
  projectConfig: ProjectConfig;
  onReset?: () => void;
  provider: string;
  onProviderChange: (id: string) => void;
  providerUsage: Record<string, any>;
  onProviderUsageUpdate: (usage: Record<string, any>) => void;
}

interface PageCache {
  [path: string]: string;
}

export function DynamicPageRenderer({ projectConfig, onReset, provider, onProviderChange, providerUsage, onProviderUsageUpdate }: DynamicPageRendererProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [visitedPages, setVisitedPages] = useState<string[]>([]);
  const [generationPrompts, setGenerationPrompts] = useState<string[]>([]);
  const [sessionStartTime] = useState(new Date());
  const [customInstructions, setCustomInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pageCacheRef = useRef<PageCache>({});
  const abortRef = useRef<AbortController | null>(null);

  // Refs to avoid stale closures in async callbacks
  const providerRef = useRef(provider);
  const providerUsageRef = useRef(providerUsage);
  const customInstructionsRef = useRef(customInstructions);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { providerUsageRef.current = providerUsage; }, [providerUsage]);
  useEffect(() => { customInstructionsRef.current = customInstructions; }, [customInstructions]);

  const handleInstructionsChange = (instructions: string) => {
    setCustomInstructions(instructions);
  };

  const handleReset = () => {
    onReset?.();
    navigate('/');
  };

  // Standalone fetch function for retry button
  const fetchPage = useCallback((path: string) => {
    // Cache hit
    if (pageCacheRef.current[path]) {
      setCurrentContent(pageCacheRef.current[path]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();

    setCurrentContent('');
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const allInstructions = [projectConfig.instructions, customInstructionsRef.current]
      .filter((s, i, a) => s && a.indexOf(s) === i) // dedupe
      .join(' ');

    setGenerationPrompts(prev => [
      ...prev,
      `[${new Date().toISOString()}] Generate ${path} via ${providerRef.current}`
    ]);

    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        project: projectConfig.name,
        instructions: allInstructions,
        sessionId: sessionStartTime.getTime(),
        provider: providerRef.current,
      }),
      signal: controller.signal
    }).then(async (response) => {
      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        pageCacheRef.current[path] = html;
        setCurrentContent(html);
        setError(null);
        setIsLoading(false);

        // Update usage from response header
        const usageHeader = response.headers.get('X-Provider-Usage');
        if (usageHeader) {
          try {
            const usage = JSON.parse(usageHeader);
            const pid = providerRef.current;
            const cur = providerUsageRef.current;
            onProviderUsageUpdate({
              ...cur,
              [pid]: { ...cur[pid], usage }
            });
          } catch { /* silent */ }
        }
      } else if (response.status === 429) {
        try {
          const data = await response.json();
          if (data.usage) {
            const cur = providerUsageRef.current;
            onProviderUsageUpdate({
              ...cur,
              [data.provider]: { ...cur[data.provider], usage: data.usage }
            });
          }
        } catch { /* silent */ }
        setError('Rate limit exceeded. Try switching providers.');
        setIsLoading(false);
      } else {
        setError(`Server error (${response.status})`);
        setIsLoading(false);
      }
    }).catch((err) => {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to generate page.');
      setIsLoading(false);
    });
  }, [projectConfig, sessionStartTime, onProviderUsageUpdate]);

  // On navigation: check cache, otherwise fetch
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/end') { handleEndSession(); return; }
    if (currentPath === '/export') return;

    if (!visitedPages.includes(currentPath)) {
      setVisitedPages(prev => [...prev, currentPath]);
    }

    fetchPage(currentPath);

    return () => {
      abortRef.current?.abort();
    };
  }, [location.pathname, retryCount]);

  // PostMessage navigation from iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate') {
        navigate(event.data.path);
      } else if (event.data.type === 'download') {
        handleDownload(event.data.downloadType, event.data.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleEndSession = () => {
    localStorage.setItem('exportSessionData', JSON.stringify({
      projectConfig, visitedPages, pageCache: pageCacheRef.current, generationPrompts, sessionStartTime
    }));
    navigate('/export');
  };

  const handleDownload = (downloadType: string, sessionData: any) => {
    switch (downloadType) {
      case 'projectFiles': {
        Object.entries(sessionData.pageCache).forEach(([path, content]) => {
          const filename = path === '/' ? 'index.html' : path.replace('/', '') + '.html';
          const blob = new Blob([content as string], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename; a.click();
          URL.revokeObjectURL(url);
        });
        break;
      }
      case 'promptLog': {
        const log = [
          "ThisProjectDoesNotExist - Generation Log", "=".repeat(50),
          `Project: ${sessionData.projectConfig.name}`,
          `Instructions: ${sessionData.projectConfig.instructions || "None"}`,
          "", "Prompts:", ...sessionData.generationPrompts,
          "", "Pages:", ...sessionData.visitedPages.map((p: string) => `- ${p}`),
        ].join("\n");
        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_log.txt'; a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'fullSession': {
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_session.json'; a.click();
        URL.revokeObjectURL(url);
        break;
      }
    }
  };

  return (
    <div className="h-screen w-full bg-[#05080a] relative overflow-hidden">
      <div className="crt-overlay" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-[#0a1018]/80 backdrop-blur-sm border-b border-[rgba(0,255,157,0.06)]">
        <div className="flex items-center gap-3">
          <span className="text-[#00ff9d]/40 text-xs font-mono">GET</span>
          <code className="text-[#c8d6e5] text-sm font-mono">
            {location.pathname === '/' ? '/' : location.pathname}
          </code>
          {isLoading && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse" />
              <span className="text-[#ffd700] text-xs font-mono">generating</span>
            </div>
          )}
        </div>
        <ProviderToggle
          activeProvider={provider}
          onProviderChange={onProviderChange}
          providerUsage={providerUsage}
        />
      </div>

      {/* Main content */}
      <div className="w-full h-full pt-10 pb-20">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-sm animate-[fade-in_0.3s_ease-out]">
              <div className="flex items-end justify-center gap-1 h-12 mb-6">
                {[0,1,2,3,4,5,6].map(i => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#00ff9d]/60 rounded-full"
                    style={{ animation: `signal-bar 0.8s ${i * 0.1}s ease-in-out infinite`, height: '8px' }}
                  />
                ))}
              </div>
              <div className="bg-[#0a1018]/80 border border-[rgba(0,255,157,0.1)] rounded-lg px-5 py-3 mb-4 font-mono">
                <span className="text-[#00ff9d]/40">fabricating </span>
                <span className="text-[#c8d6e5]">
                  {location.pathname === '/' ? 'index' : location.pathname.replace('/', '')}
                </span>
                <span className="text-[#00ff9d] animate-[terminal-blink_0.8s_step-end_infinite] ml-0.5">_</span>
              </div>
              <p className="text-[#4a6274] text-xs font-mono">the ai is generating your page...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-sm animate-[fade-in_0.3s_ease-out]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl border border-[rgba(255,62,62,0.2)] bg-[#0a1018] flex items-center justify-center">
                <span className="text-[#ff3e3e]/60 text-2xl font-mono">!</span>
              </div>
              <h3 className="font-display text-lg text-[#ff3e3e] mb-2">generation failed</h3>
              <p className="text-[#4a6274] text-sm font-mono mb-4">{error}</p>
              <button
                onClick={() => { setError(null); setRetryCount(c => c + 1); }}
                className="px-4 py-2 text-sm font-mono bg-[#0f1923] border border-[rgba(0,255,157,0.15)] text-[#00ff9d] rounded-lg hover:bg-[#0f1923]/80 hover:border-[#00ff9d]/30 transition-all"
              >
                try again
              </button>
            </div>
          </div>
        ) : currentContent ? (
          <div className="w-full h-full animate-[materialize_0.5s_ease-out]">
            <iframe
              srcDoc={currentContent}
              className="w-full h-full border-0"
              title={`${projectConfig.name} - Page Content`}
              sandbox="allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-md animate-[fade-in_0.5s_ease-out]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl border border-[rgba(0,255,157,0.1)] bg-[#0a1018] flex items-center justify-center">
                <span className="text-[#00ff9d]/30 text-2xl font-mono">/</span>
              </div>
              <h3 className="font-display text-xl text-[#c8d6e5] mb-2">{projectConfig.name}</h3>
              <p className="text-[#4a6274] text-sm font-mono mb-6">
                use the command bar below to navigate to any path
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating command bar */}
      <SessionView
        projectName={projectConfig.name}
        visitedPages={visitedPages}
        onEndSession={handleEndSession}
        onInstructionsChange={handleInstructionsChange}
        initialInstructions={customInstructions}
        isLoading={isLoading}
        onReset={handleReset}
      />
    </div>
  );
}
