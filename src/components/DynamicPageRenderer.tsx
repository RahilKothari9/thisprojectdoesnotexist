import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SessionView } from "./SessionView";

interface ProjectConfig {
  name: string;
  instructions: string;
}

interface DynamicPageRendererProps {
  projectConfig: ProjectConfig;
  onReset?: () => void;
}

interface PageCache {
  [path: string]: string;
}

type GenerationPhase = 'connecting' | 'design-system' | 'pages' | 'done' | 'error';

const SITE_PAGES = ['/', '/about', '/features', '/pricing', '/contact'];

export function DynamicPageRenderer({ projectConfig, onReset }: DynamicPageRendererProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [currentContent, setCurrentContent] = useState<string>("");
  const [visitedPages, setVisitedPages] = useState<string[]>([]);
  const [generationPrompts, setGenerationPrompts] = useState<string[]>([]);
  const [sessionStartTime] = useState(new Date());
  const [phase, setPhase] = useState<GenerationPhase>('connecting');
  const [pagesReady, setPagesReady] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pageCacheRef = useRef<PageCache>({});
  const hasStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Handle SSE events — called from the stream parser
  const handleSSEEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'design-system':
        console.log('[sse] design system received');
        setPhase('pages');
        break;

      case 'page': {
        const { path, html, pagesReady: ready } = data;
        console.log(`[sse] page ready: ${path}`);
        setPagesReady(ready);

        pageCacheRef.current[path] = html;
        setPageCache(prev => ({ ...prev, [path]: html }));

        // Auto-show homepage as soon as it arrives
        if (path === '/') {
          setCurrentContent(html);
          setVisitedPages(prev => prev.includes('/') ? prev : [...prev, '/']);
        }
        break;
      }

      case 'error':
        console.error('[sse] error:', data);
        if (data.phase === 'design-system') {
          setPhase('error');
          setErrorMessage('Failed to generate design system. Try again.');
        }
        break;

      case 'done':
        console.log(`[sse] done: ${data.totalPages}/${data.totalRequested} pages`);
        setPhase('done');
        break;
    }
  };

  // Start site generation on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const generateSite = async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      setPhase('design-system');
      setGenerationPrompts(prev => [
        ...prev,
        `[${new Date().toISOString()}] Generating full site for "${projectConfig.name}"`
      ]);

      try {
        const response = await fetch('/api/generate-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: projectConfig.name,
            instructions: projectConfig.instructions,
            sessionId: sessionStartTime.getTime()
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        // Parse SSE stream inline to avoid stale closure issues
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;
            let eventType = '';
            let eventData = '';
            for (const line of eventStr.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              else if (line.startsWith('data: ')) eventData = line.slice(6);
            }
            if (!eventType || !eventData) continue;
            try {
              handleSSEEvent(eventType, JSON.parse(eventData));
            } catch (e) {
              console.warn('[sse] parse error:', e);
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[generate] failed:', err);
        setPhase('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to generate site.');
      }
    };

    generateSite();

    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Handle navigation between cached pages
  useEffect(() => {
    const currentPath = location.pathname;

    if (currentPath === '/end') {
      handleEndSession();
      return;
    }

    if (!visitedPages.includes(currentPath)) {
      setVisitedPages(prev => [...prev, currentPath]);
    }

    // Check ref for immediate access (state may lag)
    const cached = pageCacheRef.current[currentPath];
    if (cached) {
      setCurrentContent(cached);
      setErrorMessage(null);
    } else {
      setCurrentContent('');
    }
  }, [location.pathname, pageCache]);

  // Listen for postMessage navigation from iframes
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

  const handleRetry = () => {
    window.location.reload();
  };

  const handleReset = () => {
    abortRef.current?.abort();
    onReset?.();
    navigate('/');
  };

  const handleEndSession = () => {
    const sessionData = {
      projectConfig,
      visitedPages,
      pageCache: pageCacheRef.current,
      generationPrompts,
      sessionStartTime
    };
    localStorage.setItem('exportSessionData', JSON.stringify(sessionData));
    navigate('/export');
  };

  const handleDownload = (downloadType: string, sessionData: any) => {
    switch (downloadType) {
      case 'projectFiles': {
        const files = Object.entries(sessionData.pageCache).map(([path, content]) => ({
          filename: path === '/' ? 'index.html' : path.replace('/', '') + '.html',
          content: content as string
        }));
        files.forEach(file => {
          const blob = new Blob([file.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          a.click();
          URL.revokeObjectURL(url);
        });
        break;
      }
      case 'promptLog': {
        const logContent = [
          "ThisProjectDoesNotExist - Generation Log",
          "=".repeat(50),
          `Project: ${sessionData.projectConfig.name}`,
          `Instructions: ${sessionData.projectConfig.instructions || "None"}`,
          `Session Start: ${sessionData.sessionStartTime}`,
          `Total Pages: ${sessionData.visitedPages.length}`,
          "",
          "Prompts:",
          ...sessionData.generationPrompts,
          "",
          "Pages:",
          ...sessionData.visitedPages.map((page: string) => "- " + page),
        ].join("\n");
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_log.txt';
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'fullSession': {
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_session.json';
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
    }
  };

  const isGenerating = phase !== 'done' && phase !== 'error';
  // Show content as soon as the current path is cached, even during generation
  const showContent = !!pageCacheRef.current[location.pathname];

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
          {isGenerating && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse" />
              <span className="text-[#ffd700] text-xs font-mono">
                {phase === 'design-system' ? 'design system' : `${pagesReady}/${SITE_PAGES.length} pages`}
              </span>
            </div>
          )}
          {phase === 'done' && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d]" />
              <span className="text-[#00ff9d] text-xs font-mono">{SITE_PAGES.length} pages ready</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4a6274] text-xs font-mono">{Object.keys(pageCache).length} cached</span>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full h-full pt-10 pb-20">
        {showContent && currentContent ? (
          <div className="w-full h-full animate-[materialize_0.5s_ease-out]">
            <iframe
              srcDoc={currentContent}
              className="w-full h-full border-0"
              title={`${projectConfig.name} - Page Content`}
              sandbox="allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        ) : phase === 'error' ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-sm animate-[fade-in_0.3s_ease-out]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl border border-[rgba(255,62,62,0.2)] bg-[#0a1018] flex items-center justify-center">
                <span className="text-[#ff3e3e]/60 text-2xl font-mono">!</span>
              </div>
              <h3 className="font-display text-lg text-[#ff3e3e] mb-2">generation failed</h3>
              <p className="text-[#4a6274] text-sm font-mono mb-4">{errorMessage}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm font-mono bg-[#0f1923] border border-[rgba(0,255,157,0.15)] text-[#00ff9d] rounded-lg hover:bg-[#0f1923]/80 hover:border-[#00ff9d]/30 transition-all"
              >
                try again
              </button>
            </div>
          </div>
        ) : isGenerating ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-sm animate-[fade-in_0.3s_ease-out]">
              {/* Signal bars loader */}
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
                {phase === 'design-system' ? (
                  <>
                    <span className="text-[#00ff9d]/40">crafting </span>
                    <span className="text-[#c8d6e5]">design system</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#00ff9d]/40">building </span>
                    <span className="text-[#c8d6e5]">{pagesReady}/{SITE_PAGES.length} pages</span>
                  </>
                )}
                <span className="text-[#00ff9d] animate-[terminal-blink_0.8s_step-end_infinite] ml-0.5">_</span>
              </div>

              {/* Page progress pills */}
              {phase === 'pages' && (
                <div className="flex justify-center gap-2 mb-4">
                  {SITE_PAGES.map(path => (
                    <div
                      key={path}
                      className={`px-2 py-1 text-[10px] font-mono rounded transition-all duration-300 ${
                        pageCache[path]
                          ? 'bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30'
                          : 'bg-[#0f1923]/40 text-[#4a6274] border border-[#4a6274]/20'
                      }`}
                    >
                      {path === '/' ? 'home' : path.replace('/', '')}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[#4a6274] text-xs font-mono">
                {phase === 'design-system'
                  ? 'creating a unified look for your site...'
                  : 'generating all pages in parallel...'}
              </p>
            </div>
          </div>
        ) : !currentContent ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-md animate-[fade-in_0.5s_ease-out]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl border border-[rgba(0,255,157,0.1)] bg-[#0a1018] flex items-center justify-center">
                <span className="text-[#00ff9d]/30 text-2xl font-mono">/</span>
              </div>
              <h3 className="font-display text-xl text-[#c8d6e5] mb-2">{projectConfig.name}</h3>
              <p className="text-[#4a6274] text-sm font-mono mb-6">
                page not found in cache — navigate to one of the generated pages
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Floating command bar */}
      <SessionView
        projectName={projectConfig.name}
        visitedPages={visitedPages}
        onEndSession={handleEndSession}
        isLoading={isGenerating}
        onReset={handleReset}
        pageCache={pageCache}
        sitePages={SITE_PAGES}
      />
    </div>
  );
}
