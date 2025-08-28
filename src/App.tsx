import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { InitialSetup } from "@/components/InitialSetup";
import { DynamicPageRenderer } from "@/components/DynamicPageRenderer";

interface ProjectConfig {
  name: string;
  instructions: string;
}

function App() {
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);

  const handleConfirm = (name: string, instructions: string) => {
    setProjectConfig({ name, instructions });
  };

  // If no project config is set, show the initial setup
  if (!projectConfig) {
    return <InitialSetup onConfirm={handleConfirm} />;
  }

  // Once project is configured, show the dynamic page renderer with routing
  return (
    <Router>
      <Routes>
        <Route 
          path="*" 
          element={<DynamicPageRenderer projectConfig={projectConfig} />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
