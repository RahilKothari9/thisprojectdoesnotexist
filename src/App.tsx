import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { InitialSetup } from "@/components/InitialSetup";
import { DynamicPageRenderer } from "@/components/DynamicPageRenderer";
import ExportPage from "@/components/ExportPage";

interface ProjectConfig {
  name: string;
  instructions: string;
}

function App() {
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('projectConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setProjectConfig(parsed);
      } catch (error) {
        console.error('Failed to parse saved project config:', error);
        localStorage.removeItem('projectConfig');
      }
    }
    setIsLoading(false);
  }, []);

  const handleConfirm = (name: string, instructions: string) => {
    const config = { name, instructions };
    setIsTransitioning(true);
    setTimeout(() => {
      setProjectConfig(config);
      localStorage.setItem('projectConfig', JSON.stringify(config));
      setIsTransitioning(false);
    }, 400);
  };

  const handleReset = () => {
    setProjectConfig(null);
    localStorage.removeItem('projectConfig');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080a] grid-bg">
        <div className="crt-overlay" />
        <div className="text-center animate-[fade-in_0.5s_ease-out]">
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
          <p className="font-mono text-[#4a6274] text-sm">initializing...</p>
        </div>
      </div>
    );
  }

  if (!projectConfig) {
    return (
      <div className={isTransitioning ? "animate-[fade-in_0.4s_ease-out_reverse_forwards]" : ""}>
        <InitialSetup onConfirm={handleConfirm} />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.4s_ease-out]">
      <Router>
        <Routes>
          <Route path="/export" element={<ExportPage />} />
          <Route
            path="*"
            element={<DynamicPageRenderer projectConfig={projectConfig} onReset={handleReset} />}
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
