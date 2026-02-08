import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SessionView } from "./SessionView";
import { RuneCircle } from "@/components/arcane/RuneCircle";
import { OrnateBorder } from "@/components/arcane/OrnateBorder";

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
  const [showRipple, setShowRipple] = useState(false);

  const handleInstructionsChange = (instructions: string) => {
    setCustomInstructions(instructions);
  };

  useEffect(() => {
    if (currentContent) {
      setShowRipple(true);
      const timer = setTimeout(() => setShowRipple(false), 600);
      return () => clearTimeout(timer);
    }
  }, [currentContent]);

  const handleReset = () => {
    if (onReset) {
      onReset(); // Clear project config and localStorage
    }
    navigate('/'); // Navigate back to home URL
  };

  useEffect(() => {
    const currentPath = location.pathname;
    console.log(`🧭 Navigation to: ${currentPath}`);

    // Handle the /end route specially
    if (currentPath === '/end') {
      handleEndSession();
      return;
    }

    // Track visited pages
    if (!visitedPages.includes(currentPath)) {
      setVisitedPages(prev => [...prev, currentPath]);
    }

    // Check if content is already cached
    if (pageCache[currentPath]) {
      console.log(`💾 Using cached content for: ${currentPath}`);
      setCurrentContent(pageCache[currentPath]);
      setIsLoading(false);
      return;
    }

    // Check if request is already in progress
    if (activeRequests.has(currentPath)) {
      console.log(`⏳ Request already in progress for: ${currentPath}`);
      return;
    }

    console.log(`🚀 Fetching new content for: ${currentPath}`);
    // Fetch new content from LLM backend
    setIsLoading(true);
    setActiveRequests(prev => new Set([...prev, currentPath]));

    const fetchPageContent = async () => {
      try {
        // Create generation prompt for LLM
        const allInstructions = [
          projectConfig.instructions,
          customInstructions
        ].filter(Boolean).join(' ');

        const prompt = `Generate a ${currentPath === '/' ? 'homepage' : currentPath.replace('/', '') + ' page'} for project "${projectConfig.name}". ${allInstructions ? `Additional context: ${allInstructions}` : ''}`;

        setGenerationPrompts(prev => [...prev, `[${new Date().toISOString()}] ${prompt}`]);

        // Call backend LLM API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

          // Cache the content
          setPageCache(prev => ({
            ...prev,
            [currentPath]: htmlContent
          }));

          setCurrentContent(htmlContent);
          setIsLoading(false);
          setActiveRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentPath);
            return newSet;
          });
        } else {
          throw new Error(`Backend API error: ${response.status}`);
        }
      } catch (error) {
        console.error('Error generating page:', error);
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentPath);
          return newSet;
        });
        // Keep loading state to show proper loading UI instead of fallback
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request timed out, still waiting for backend...');
        } else {
          console.log('Backend connection issue, retrying...');
        }
        // Don't set isLoading to false here - let it keep showing loading UI
        // Only set to false on successful response
      }
    };

    fetchPageContent();
  }, [location.pathname, projectConfig.name, projectConfig.instructions, customInstructions, sessionStartTime]);

  // Handle download requests from iframe
  const handleDownload = (downloadType: string, sessionData: any) => {
    switch (downloadType) {
      case 'projectFiles':
        const zip = Object.entries(sessionData.pageCache).map(([path, content]) => {
          const filename = path === '/' ? 'index.html' : path.replace('/', '') + '.html';
          return { filename, content: content as string };
        });

        // Download individual files
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
          "ThisProjectDoesNotExist - AI Generation Log",
          "=".repeat(50),
          "Project: " + sessionData.projectConfig.name,
          "Instructions: " + (sessionData.projectConfig.instructions || "None provided"),
          "Session Start: " + sessionData.sessionStartTime,
          "Total Pages: " + sessionData.visitedPages.length,
          "",
          "Generation Prompts:",
          "=".repeat(20),
          ...sessionData.generationPrompts,
          "",
          "Visited Pages:",
          "=".repeat(15),
          ...sessionData.visitedPages.map((page: string) => "- " + page),
          "",
          "Generated by ThisProjectDoesNotExist",
          "https://github.com/yourproject/thisprojectdoesnotexist"
        ].join("\n");

        const logBlob = new Blob([logContent], { type: 'text/plain' });
        const logUrl = URL.createObjectURL(logBlob);
        const logA = document.createElement('a');
        logA.href = logUrl;
        logA.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_generation_log.txt';
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

  // Listen for navigation and download messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate') {
        const { path } = event.data;
        console.log(`📨 Received navigation message for: ${path}`);
        navigate(path);
      } else if (event.data.type === 'download') {
        const { downloadType, data } = event.data;
        console.log(`📨 Received download message for: ${downloadType}`);
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
    // Store session data in localStorage for the export page
    localStorage.setItem('exportSessionData', JSON.stringify(sessionData));

    navigate('/export');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex">
        <SessionView
          projectName={projectConfig.name}
          visitedPages={visitedPages}
          onEndSession={handleEndSession}
          onInstructionsChange={handleInstructionsChange}
          initialInstructions={customInstructions}
          isLoading={isLoading}
          onReset={handleReset}
        />
        <OrnateBorder thin />
        <div className="flex-1 w-full ml-0 md:ml-80">
          {/* Gold spine divider */}
          <div className="fixed left-80 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#d4a843]/30 to-transparent z-30 animate-[pulse-glow_4s_ease-in-out_infinite]" style={{ boxShadow: '0 0 8px rgba(212, 168, 67, 0.1)' }}></div>
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0612 70%)" }}
          >
            <div className="text-center max-w-md">
              <RuneCircle size={80} className="mx-auto mb-8" />
              <h2 className="font-cinzel text-xl text-[#e8dcc8] mb-3 italic">The spirits are crafting your page...</h2>
              <div className="bg-[#1e1233]/60 backdrop-blur-sm rounded-lg px-4 py-3 mb-6 border border-[rgba(212,168,67,0.15)]">
                <code className="text-[#d4a843] font-mono text-lg">
                  {location.pathname === '/' ? 'Homepage' : location.pathname}
                </code>
              </div>
              <div className="flex justify-center space-x-3 mb-4">
                <div className="w-1.5 h-1.5 bg-[#d4a843] rotate-45 animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-[#d4a843] rotate-45 animate-pulse animation-delay-200"></div>
                <div className="w-1.5 h-1.5 bg-[#d4a843] rotate-45 animate-pulse animation-delay-400"></div>
              </div>
              <p className="text-sm text-[#9a8c7a] italic">
                Weaving incantations into reality...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex">
      <SessionView
        projectName={projectConfig.name}
        visitedPages={visitedPages}
        onEndSession={handleEndSession}
        onInstructionsChange={handleInstructionsChange}
        initialInstructions={customInstructions}
        isLoading={isLoading}
        onReset={handleReset}
      />
      <OrnateBorder thin />
      <div className="flex-1 w-full ml-0 md:ml-80">
        {/* Gold spine divider */}
        <div className="fixed left-80 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#d4a843]/30 to-transparent z-30" style={{ boxShadow: '0 0 8px rgba(212, 168, 67, 0.1)' }}></div>
        {currentContent ? (
          <div className="w-full h-full relative border border-[rgba(212,168,67,0.1)] shadow-[inset_0_0_30px_rgba(212,168,67,0.03)]"
            style={{ background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0612 70%)" }}
          >
            <iframe
              srcDoc={currentContent}
              className="w-full h-full border-0"
              title={`${projectConfig.name} - Page Content`}
              sandbox="allow-same-origin allow-scripts allow-downloads"
            />
            {showRipple && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div
                  className="w-20 h-20 rounded-full animate-[ripple_0.6s_ease-out_forwards]"
                  style={{ background: "radial-gradient(circle, rgba(212,168,67,0.4) 0%, transparent 70%)" }}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0612 70%)" }}
          >
            <div className="text-center max-w-md">
              <RuneCircle size={80} animate={false} className="mx-auto mb-6 opacity-30" />
              <h3 className="font-cinzel text-lg text-[#e8dcc8] mb-3">Awaiting Conjuration</h3>
              <p className="text-[#9a8c7a] mb-4 italic">Navigate to a path to begin conjuring</p>
              <div className="bg-[#1e1233]/40 rounded-lg px-4 py-2 mb-4 border border-[rgba(139,92,246,0.15)]">
                <code className="text-[#d4a843] font-mono">{location.pathname === '/' ? 'homepage' : location.pathname}</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
