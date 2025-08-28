import { useState, useEffect } from "react";
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

  const handleInstructionsChange = (instructions: string) => {
    setCustomInstructions(instructions);
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

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate') {
        const { path } = event.data;
        console.log(`📨 Received navigation message for: ${path}`);
        navigate(path);
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

    const endPageContent = generateEndPageContent(sessionData);
    setCurrentContent(endPageContent);
    setIsLoading(false);
  };

  const generateEndPageContent = (sessionData: SessionData): string => {
    const sessionDuration = Math.round((new Date().getTime() - sessionData.sessionStartTime.getTime()) / 1000 / 60);
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Complete - ${sessionData.projectConfig.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: #e2e8f0;
            min-height: 100vh;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid #475569;
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            text-align: center;
            color: #f8fafc;
            background: linear-gradient(135deg, #f8fafc 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 2rem 0;
          }
          .stat-card {
            background: rgba(30, 41, 59, 0.6);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #475569;
          }
          .download-section {
            margin-top: 3rem;
            padding: 2rem;
            background: #f1f5f9;
            border-radius: 12px;
            border: 2px dashed #cbd5e1;
          }
          .download-btn {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            margin: 8px;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
          }
          .download-btn:hover {
            background: linear-gradient(135deg, #1d4ed8, #1e40af);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .pages-list {
            columns: 2;
            gap: 20px;
            margin: 1rem 0;
          }
          .page-item {
            break-inside: avoid;
            background: rgba(30, 41, 59, 0.4);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            border: 1px solid #475569;
            color: #e2e8f0;
          }
          .new-session-btn {
            background: transparent;
            border: 2px solid #94a3b8;
            color: #94a3b8;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
          }
          .new-session-btn:hover {
            background: #94a3b8;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Session Complete</h1>
          <p style="text-align: center; font-size: 1.1rem; margin-bottom: 2rem; color: #cbd5e1;">
            Your AI-generated project <strong style="color: #f8fafc;">${sessionData.projectConfig.name}</strong> is ready for download.
          </p>

          <div class="stats">
            <div class="stat-card">
              <h3>Pages Created</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #059669;">${sessionData.visitedPages.length}</div>
            </div>
            <div class="stat-card">
              <h3>Session Duration</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #0d9488;">${sessionDuration} min</div>
            </div>
            <div class="stat-card">
              <h3>AI Generations</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #0891b2;">${sessionData.generationPrompts.length}</div>
            </div>
            <div class="stat-card">
              <h3>Cache Size</h3>
              <div style="font-size: 2rem; font-weight: bold; color: #7c3aed;">${Math.round(JSON.stringify(sessionData.pageCache).length / 1024)} KB</div>
            </div>
          </div>

          <div class="download-section">
            <h2>Download Your Project</h2>
            <p style="color: #64748b;">Save your complete AI-generated project for future reference or development.</p>
            
            <button class="download-btn" onclick="downloadProjectFiles()">
              Download All Pages (.html)
            </button>
            
            <button class="download-btn" onclick="downloadPromptLog()">
              Download AI Chat Log (.txt)
            </button>
            
            <button class="download-btn" onclick="downloadFullSession()">
              Download Session Data (.json)
            </button>

            <h3 style="margin-top: 2rem; color: #1e293b;">Generated Pages:</h3>
            <div class="pages-list">
              ${sessionData.visitedPages.map(page => `
                <div class="page-item">
                  <strong>${page === '/' ? '/home' : page}</strong><br>
                  <small style="color: #64748b;">Generated: ${new Date().toLocaleString()}</small>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="text-align: center; margin-top: 3rem;">
            <button class="new-session-btn" onclick="window.location.href='/'">
              Start New Project
            </button>
          </div>
        </div>

        <script>
          const sessionData = ${JSON.stringify(sessionData)};
          
          function downloadProjectFiles() {
            const zip = Object.entries(sessionData.pageCache).map(([path, content]) => {
              const filename = path === '/' ? 'index.html' : path.replace('/', '') + '.html';
              return { filename, content };
            });
            
            // Simple download for individual files
            zip.forEach(file => {
              const blob = new Blob([file.content], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = file.filename;
              a.click();
              URL.revokeObjectURL(url);
            });
          }
          
          function downloadPromptLog() {
            const logContent = [
              "ThisProjectDoesNotExist - AI Generation Log",
              "=" .repeat(50),
              "Project: " + sessionData.projectConfig.name,
              "Instructions: " + (sessionData.projectConfig.instructions || "None provided"),
              "Session Start: " + sessionData.sessionStartTime,
              "Total Pages: " + sessionData.visitedPages.length,
              "",
              "Generation Prompts:",
              "=" .repeat(20),
              ...sessionData.generationPrompts,
              "",
              "Visited Pages:",
              "=" .repeat(15),
              ...sessionData.visitedPages.map(page => "- " + page),
              "",
              "Generated by ThisProjectDoesNotExist",
              "https://github.com/yourproject/thisprojectdoesnotexist"
            ].join("\\n");
            
            const blob = new Blob([logContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = sessionData.projectConfig.name.replace(/\\s+/g, '_') + '_generation_log.txt';
            a.click();
            URL.revokeObjectURL(url);
          }
          
          function downloadFullSession() {
            const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = sessionData.projectConfig.name.replace(/\\s+/g, '_') + '_session.json';
            a.click();
            URL.revokeObjectURL(url);
          }
        </script>
      </body>
      </html>
    `;
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
          onReset={onReset}
        />
        <div className="flex-1 w-full" style={{ marginLeft: '320px' }}>
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center max-w-md">
              <div className="relative mb-8">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">✨ AI is crafting your page...</h2>
              <p className="text-slate-300 mb-4">Generating professional content for:</p>
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg px-4 py-3 mb-6 border border-slate-700">
                <code className="text-blue-400 font-mono text-lg">
                  {location.pathname === '/' ? 'Homepage' : location.pathname}
                </code>
              </div>
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-slate-400">
                Creating realistic content with modern design...
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
        onReset={onReset}
      />
      <div className="flex-1 w-full" style={{ marginLeft: '320px' }}>
        {currentContent ? (
          <iframe
            srcDoc={currentContent}
            className="w-full h-full border-0"
            title={`${projectConfig.name} - Page Content`}
            sandbox="allow-same-origin allow-scripts allow-downloads"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Waiting for LLM Backend</h3>
              <p className="text-slate-300 mb-4">Connect your LLM backend to generate dynamic content for:</p>
              <div className="bg-slate-800/50 rounded-lg px-4 py-2 mb-4">
                <code className="text-blue-400 font-mono">{location.pathname === '/' ? 'homepage' : location.pathname}</code>
              </div>
              <p className="text-sm text-slate-400">
                All page content will be generated in real-time once your backend is connected.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
