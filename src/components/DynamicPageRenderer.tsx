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

interface SessionData {
  projectConfig: ProjectConfig;
  visitedPages: string[];
  pageCache: PageCache;
  generationPrompts: string[];
  sessionStartTime: Date;
}

export function DynamicPageRenderer({ projectConfig, onReset }: DynamicPageRendererProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [visitedPages, setVisitedPages] = useState<string[]>([]);
  const [generationPrompts, setGenerationPrompts] = useState<string[]>([]);
  const [sessionStartTime] = useState(new Date());
  const [customInstructions, setCustomInstructions] = useState(projectConfig.instructions);
  const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const handleInstructionsChange = (instructions: string) => {
    setCustomInstructions(instructions);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    navigate('/');
  };

  useEffect(() => {
    const currentPath = location.pathname;
    console.log(`Navigation to: ${currentPath}`);

    if (currentPath === '/end') {
      handleEndSession();
      return;
    }

    // Don't auto-generate on initial load — let user choose where to go
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    if (!visitedPages.includes(currentPath)) {
      setVisitedPages(prev => [...prev, currentPath]);
    }

    if (pageCache[currentPath]) {
      console.log(`Using cached content for: ${currentPath}`);
      setCurrentContent(pageCache[currentPath]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (activeRequests.has(currentPath)) {
      console.log(`Request already in progress for: ${currentPath}`);
      return;
    }

    console.log(`Fetching new content for: ${currentPath}`);
    setIsLoading(true);
    setError(null);
    setActiveRequests(prev => new Set([...prev, currentPath]));

    const fetchPageContent = async () => {
      try {
        const allInstructions = [
          projectConfig.instructions,
          customInstructions
        ].filter(Boolean).join(' ');

        const prompt = `Generate a ${currentPath === '/' ? 'homepage' : currentPath.replace('/', '') + ' page'} for project "${projectConfig.name}". ${allInstructions ? `Additional context: ${allInstructions}` : ''}`;

        setGenerationPrompts(prev => [...prev, `[${new Date().toISOString()}] ${prompt}`]);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: currentPath,
            project: projectConfig.name,
            instructions: allInstructions,
            customInstructions: customInstructions,
            sessionId: sessionStartTime.getTime()
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const htmlContent = await response.text();

          setPageCache(prev => ({
            ...prev,
            [currentPath]: htmlContent
          }));

          setCurrentContent(htmlContent);
          setError(null);
          setIsLoading(false);
        } else {
          const text = await response.text();
          throw new Error(text.includes('fabrication failed') ? 'Generation failed — the AI returned incomplete content. Try again.' : `Server error (${response.status})`);
        }
      } catch (err) {
        console.error('Error generating page:', err);
        setIsLoading(false);
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out. The AI took too long to respond.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to generate page. Check your connection.');
        }
      } finally {
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentPath);
          return newSet;
        });
      }
    };

    fetchPageContent();
  }, [location.pathname]);

  const handleDownload = (downloadType: string, sessionData: any) => {
    switch (downloadType) {
      case 'projectFiles':
        const zip = Object.entries(sessionData.pageCache).map(([path, content]) => {
          const filename = path === '/' ? 'index.html' : path.replace('/', '') + '.html';
          return { filename, content: content as string };
        });

        zip.forEach(file => {
          const blob = new Blob([file.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          a.click();
          URL.revokeObjectURL(url);
        });
        break;

      case 'promptLog':
        const logContent = [
          "ThisProjectDoesNotExist - Generation Log",
          "=".repeat(50),
          "Project: " + sessionData.projectConfig.name,
          "Instructions: " + (sessionData.projectConfig.instructions || "None"),
          "Session Start: " + sessionData.sessionStartTime,
          "Total Pages: " + sessionData.visitedPages.length,
          "",
          "Prompts:",
          ...sessionData.generationPrompts,
          "",
          "Pages:",
          ...sessionData.visitedPages.map((page: string) => "- " + page),
        ].join("\n");

        const logBlob = new Blob([logContent], { type: 'text/plain' });
        const logUrl = URL.createObjectURL(logBlob);
        const logA = document.createElement('a');
        logA.href = logUrl;
        logA.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_log.txt';
        logA.click();
        URL.revokeObjectURL(logUrl);
        break;

      case 'fullSession':
        const sessionBlob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
        const sessionUrl = URL.createObjectURL(sessionBlob);
        const sessionA = document.createElement('a');
        sessionA.href = sessionUrl;
        sessionA.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_session.json';
        sessionA.click();
        URL.revokeObjectURL(sessionUrl);
        break;

      default:
        console.error('Unknown download type:', downloadType);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate') {
        const { path } = event.data;
        console.log(`Received navigation message for: ${path}`);
        navigate(path);
      } else if (event.data.type === 'download') {
        const { downloadType, data } = event.data;
        console.log(`Received download message for: ${downloadType}`);
        handleDownload(downloadType, data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleEndSession = () => {
    const sessionData: SessionData = {
      projectConfig,
      visitedPages,
      pageCache,
      generationPrompts,
      sessionStartTime
    };
    localStorage.setItem('exportSessionData', JSON.stringify(sessionData));
    navigate('/export');
  };

  return (
    <div className="h-screen w-full bg-[#05080a] relative overflow-hidden">
      <div className="crt-overlay" />

      {/* Current path indicator - top bar */}
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
        <div className="flex items-center gap-2">
          <span className="text-[#4a6274] text-xs font-mono">{visitedPages.length} pages</span>
        </div>
      </div>

      {/* Main content area - full screen */}
      <div className="w-full h-full pt-10 pb-20">
        {isLoading ? (
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
                <span className="text-[#00ff9d]/40">fabricating </span>
                <span className="text-[#c8d6e5]">
                  {location.pathname === '/' ? 'index' : location.pathname.replace('/', '')}
                </span>
                <span className="text-[#00ff9d] animate-[terminal-blink_0.8s_step-end_infinite] ml-0.5">_</span>
              </div>

              <p className="text-[#4a6274] text-xs font-mono">
                the ai is generating your page...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center max-w-sm animate-[fade-in_0.3s_ease-out]">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl border border-[rgba(255,62,62,0.2)] bg-[#0a1018] flex items-center justify-center">
                <span className="text-[#ff3e3e]/60 text-2xl font-mono">!</span>
              </div>
              <h3 className="font-display text-lg text-[#ff3e3e] mb-2">generation failed</h3>
              <p className="text-[#4a6274] text-sm font-mono mb-4">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  // Re-trigger by navigating to the same path
                  const path = location.pathname;
                  navigate('/');
                  setTimeout(() => navigate(path), 10);
                }}
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
                use the command bar below to navigate to any path — try <code className="text-[#00ff9d]/60">/</code>, <code className="text-[#00ff9d]/60">/about</code>, <code className="text-[#00ff9d]/60">/pricing</code>, or anything you want
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
