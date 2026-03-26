import { useState, useEffect, useRef } from "react";
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
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [visitedPages, setVisitedPages] = useState<string[]>([]);
  const [generationPrompts, setGenerationPrompts] = useState<string[]>([]);
  const [sessionStartTime] = useState(new Date());
  const [customInstructions, setCustomInstructions] = useState(projectConfig.instructions);
  const [error, setError] = useState<string | null>(null);
  const pageCacheRef = useRef<PageCache>({});
  const activeRequests = useRef<Set<string>>(new Set());
  const providerRef = useRef(provider);
  const currentPathRef = useRef(location.pathname);

  // Keep refs in sync
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { currentPathRef.current = location.pathname; }, [location.pathname]);

  const handleInstructionsChange = (instructions: string) => {
    setCustomInstructions(instructions);
  };

  const handleReset = () => {
    onReset?.();
    navigate('/');
  };

  const fetchPageRef = useRef<(path: string) => Promise<void>>(null!);

  // Extract internal link paths from HTML and preload uncached ones
  const preloadLinkedPages = (html: string) => {
    const regex = /href=["'](\/[^"'#?]*)["']/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      if (href && !pageCacheRef.current[href] && !activeRequests.current.has(href)) {
        fetchPageRef.current?.(href);
      }
    }
  };

  // Fetch a page from the backend
  const fetchPage = async (path: string) => {
    if (pageCacheRef.current[path] || activeRequests.current.has(path)) return;

    activeRequests.current.add(path);

    // Only show loading spinner if this is the page the user is currently viewing
    const isCurrentPage = currentPathRef.current === path;
    if (isCurrentPage) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const allInstructions = [projectConfig.instructions, customInstructions]
        .filter(Boolean).join(' ');

      setGenerationPrompts(prev => [
        ...prev,
        `[${new Date().toISOString()}] Generate ${path} via ${providerRef.current}`
      ]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/generate', {
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
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        pageCacheRef.current[path] = html;
        setPageCache(prev => ({ ...prev, [path]: html }));

        // Update usage from response header
        const usageHeader = response.headers.get('X-Provider-Usage');
        if (usageHeader) {
          try {
            const usage = JSON.parse(usageHeader);
            const pid = providerRef.current;
            onProviderUsageUpdate({
              ...providerUsage,
              [pid]: { ...providerUsage[pid], usage }
            });
          } catch { /* silent */ }
        }

        // Show content if user is STILL on this path (check ref, not closure)
        if (currentPathRef.current === path) {
          setCurrentContent(html);
          setError(null);
          setIsLoading(false);
        }

        // Silently preload any internal links found in this page
        preloadLinkedPages(html);
      } else if (response.status === 429) {
        try {
          const data = await response.json();
          if (data.usage) {
            onProviderUsageUpdate({
              ...providerUsage,
              [data.provider]: { ...providerUsage[data.provider], usage: data.usage }
            });
          }
        } catch { /* silent */ }
        if (currentPathRef.current === path) {
          throw new Error('Rate limit exceeded. Try switching providers.');
        }
      } else {
        if (currentPathRef.current === path) {
          throw new Error(`Server error (${response.status})`);
        }
      }
    } catch (err) {
      // Only show errors for the page the user is currently on
      if (currentPathRef.current === path) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to generate page.');
        }
        setIsLoading(false);
      }
    } finally {
      activeRequests.current.delete(path);
      // Clear loading only if no active request for the current page
      if (!activeRequests.current.has(currentPathRef.current)) {
        setIsLoading(false);
      }
    }
  };
  fetchPageRef.current = fetchPage;

  // Navigate: check cache first, then fetch on-demand
  useEffect(() => {
    const currentPath = location.pathname;

    if (currentPath === '/end') {
      handleEndSession();
      return;
    }
    if (currentPath === '/export') return;

    if (!visitedPages.includes(currentPath)) {
      setVisitedPages(prev => [...prev, currentPath]);
    }

    // Cache hit — instant
    if (pageCacheRef.current[currentPath]) {
      setCurrentContent(pageCacheRef.current[currentPath]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Already being fetched (preload in progress) — show loading, wait for it
    if (activeRequests.current.has(currentPath)) {
      setCurrentContent('');
      setIsLoading(true);
      return;
    }

    // Cache miss — generate on demand
    setCurrentContent('');
    fetchPage(currentPath);
  }, [location.pathname]);

  // When pageCache updates (from preloading), check if current page is now available
  useEffect(() => {
    const cp = location.pathname;
    if (!currentContent && pageCacheRef.current[cp]) {
      setCurrentContent(pageCacheRef.current[cp]);
      setError(null);
      setIsLoading(false);
    }
  }, [pageCache]);

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
                    style={{
                      animation: `signal-bar 0.8s ${i * 0.1}s ease-in-out infinite`,
                      height: '8px'
                    }}
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
                onClick={() => { setError(null); fetchPage(location.pathname); }}
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
