import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Database, Plus, ArrowLeft } from 'lucide-react';

interface SessionData {
  projectConfig: {
    name: string;
    instructions: string;
  };
  visitedPages: string[];
  pageCache: Map<string, string>;
  generationPrompts: string[];
  sessionStartTime: Date;
}

function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || target === 0) return;
    startedRef.current = true;

    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

export default function ExportPage() {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  useEffect(() => {
    const storedData = localStorage.getItem('exportSessionData');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      const pageCache = new Map(Object.entries(parsed.pageCache || {}));
      const sessionStartTime = new Date(parsed.sessionStartTime);

      const fullSessionData = {
        ...parsed,
        pageCache,
        sessionStartTime
      };

      setSessionData(fullSessionData);
      setSessionDuration(Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60));
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleDownload = (downloadType: string) => {
    if (!sessionData) return;

    switch (downloadType) {
      case 'projectFiles': {
        const files = Array.from(sessionData.pageCache.entries()).map(([path, content]) => {
          const filename = path === '/' ? 'index.html' : path.replace('/', '') + '.html';
          return { filename, content };
        });
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
      }
      case 'fullSession': {
        const exportData = {
          ...sessionData,
          pageCache: Object.fromEntries(sessionData.pageCache)
        };
        const sessionBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const sessionUrl = URL.createObjectURL(sessionBlob);
        const sessionA = document.createElement('a');
        sessionA.href = sessionUrl;
        sessionA.download = sessionData.projectConfig.name.replace(/\s+/g, '_') + '_session.json';
        sessionA.click();
        URL.revokeObjectURL(sessionUrl);
        break;
      }
    }
  };

  const handleStartNewSession = () => {
    localStorage.removeItem('exportSessionData');
    localStorage.removeItem('projectConfig');
    navigate('/');
  };

  const pagesCount = useCountUp(sessionData?.visitedPages.length ?? 0);
  const minutesCount = useCountUp(sessionDuration);
  const promptsCount = useCountUp(sessionData?.generationPrompts.length ?? 0);

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-[#05080a] grid-bg flex items-center justify-center">
        <div className="crt-overlay" />
        <div className="text-center animate-[fade-in_0.3s_ease-out]">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className="w-1 bg-[#00ff9d] rounded-full"
                style={{
                  animation: `signal-bar 1s ${i * 0.15}s ease-in-out infinite`,
                  height: '12px'
                }}
              />
            ))}
          </div>
          <p className="font-mono text-[#4a6274] text-sm">loading session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080a] grid-bg noise-bg relative">
      <div className="crt-overlay" />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00ff9d]/[0.015] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#4a6274] hover:text-[#c8d6e5] text-xs font-mono mb-10 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          back
        </button>

        {/* Header */}
        <div className="mb-12 animate-[fade-in-up_0.5s_ease-out]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,255,157,0.15)] bg-[rgba(0,255,157,0.05)] mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d]" />
            <span className="text-[#00ff9d] text-xs font-mono uppercase tracking-wider">session complete</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            {sessionData.projectConfig.name}
          </h1>
          <p className="text-[#4a6274] font-mono text-sm">
            fabrication complete. download your files below.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10 animate-[fade-in-up_0.5s_0.1s_ease-out_both]">
          {[
            { value: pagesCount, label: "pages" },
            { value: minutesCount, label: "minutes" },
            { value: promptsCount, label: "prompts" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="bg-[#0a1018]/80 border border-[rgba(0,255,157,0.08)] rounded-lg p-4 text-center"
            >
              <div className="font-display text-3xl font-bold text-[#00ff9d] glow-green mb-1">{value}</div>
              <div className="text-[#4a6274] text-xs font-mono">{label}</div>
            </div>
          ))}
        </div>

        {/* Downloads */}
        <div className="space-y-2 mb-10 animate-[fade-in-up_0.5s_0.2s_ease-out_both]">
          <span className="text-[10px] text-[#4a6274] font-mono uppercase tracking-wider block mb-3">downloads</span>

          {[
            { icon: FileDown, label: "html files", desc: "all generated pages as .html", action: 'projectFiles' },
            { icon: FileText, label: "generation log", desc: "prompts and metadata as .txt", action: 'promptLog' },
            { icon: Database, label: "full session", desc: "everything as .json", action: 'fullSession' },
          ].map(({ icon: Icon, label, desc, action }) => (
            <button
              key={action}
              onClick={() => handleDownload(action)}
              className="w-full flex items-center gap-4 p-4 bg-[#0a1018]/60 border border-[rgba(0,255,157,0.08)] rounded-lg hover:border-[rgba(0,255,157,0.2)] hover:bg-[#0a1018]/80 transition-all duration-200 group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[#0f1923] border border-[rgba(0,255,157,0.08)] flex items-center justify-center group-hover:border-[rgba(0,255,157,0.2)] transition-colors">
                <Icon className="w-4 h-4 text-[#00ff9d]/60 group-hover:text-[#00ff9d] transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-mono text-[#c8d6e5]">{label}</div>
                <div className="text-xs font-mono text-[#4a6274]">{desc}</div>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#4a6274]/30 rotate-[135deg] group-hover:text-[#00ff9d]/40 transition-colors" />
            </button>
          ))}
        </div>

        {/* Generated pages list */}
        <div className="mb-10 animate-[fade-in-up_0.5s_0.3s_ease-out_both]">
          <span className="text-[10px] text-[#4a6274] font-mono uppercase tracking-wider block mb-3">generated pages</span>
          <div className="flex flex-wrap gap-2">
            {sessionData.visitedPages.map((page, index) => (
              <div key={index} className="px-3 py-1.5 bg-[#0a1018]/60 border border-[rgba(0,255,157,0.08)] rounded-md">
                <span className="text-[#c8d6e5] font-mono text-xs">
                  {page === '/' ? 'index.html' : page.replace('/', '') + '.html'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* New session */}
        <div className="animate-[fade-in-up_0.5s_0.4s_ease-out_both]">
          <Button
            onClick={handleStartNewSession}
            variant="outline"
            className="font-mono border-[rgba(0,255,157,0.15)] text-[#00ff9d] hover:bg-[#00ff9d]/5 hover:border-[#00ff9d]/30 transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            new project
          </Button>
        </div>
      </div>
    </div>
  );
}
