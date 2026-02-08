import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { InitialSetup } from "@/components/InitialSetup";
import { DynamicPageRenderer } from "@/components/DynamicPageRenderer";
import ExportPage from "@/components/ExportPage";
import { RuneCircle } from "@/components/arcane/RuneCircle";

interface ProjectConfig {
  name: string;
  instructions: string;
}

function App() {
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load project config from localStorage on app start
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
    }, 500);
  };

  const handleReset = () => {
    setProjectConfig(null);
    localStorage.removeItem('projectConfig');
  };

  // Show loading while checking for saved config
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0612 70%)" }}
      >
        <div className="text-center">
          <RuneCircle size={60} className="mx-auto mb-6" />
          <p className="font-cinzel text-[#e8dcc8] text-sm">Preparing the grimoire...</p>
        </div>
      </div>
    );
  }

  // If no project config is set, show the initial setup
  if (!projectConfig) {
    return (
      <div
        className={isTransitioning ? "animate-[book-open_0.5s_ease-out_forwards]" : ""}
        style={isTransitioning ? { transformOrigin: "center center" } : undefined}
      >
        <InitialSetup onConfirm={handleConfirm} />
      </div>
    );
  }

  // Once project is configured, show the dynamic page renderer with routing
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
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
