import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { generateRandomName } from "@/utils/nameGenerator";

interface InitialSetupProps {
  onConfirm: (name: string, instructions: string) => void;
}

export function InitialSetup({ onConfirm }: InitialSetupProps) {
  const [projectName, setProjectName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [currentSpinnerName, setCurrentSpinnerName] = useState("");

  useEffect(() => {
    // Simple spinner effect that cycles through names
    const spinnerNames: string[] = [];
    for (let i = 0; i < 6; i++) {
      spinnerNames.push(generateRandomName());
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < spinnerNames.length) {
        setCurrentSpinnerName(spinnerNames[currentIndex]);
        currentIndex++;
      } else {
        // Stop spinner and set final name
        setIsGenerating(false);
        const finalName = generateRandomName();
        setProjectName(finalName);
        setCurrentSpinnerName("");
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleConfirm = () => {
    if (projectName.trim()) {
      onConfirm(projectName.trim(), instructions.trim());
    }
  };

  const handleRegenerateProject = () => {
    setProjectName(generateRandomName());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6 w-full overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            ThisProjectDoesNotExist
          </h1>
          <p className="text-lg text-slate-300 mb-2">
            Instant Ideation Tool
          </p>
          <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
            Generate instant mockups and prototypes. Perfect for brainstorming, 
            client presentations, and rapid concept validation.
          </p>
        </div>

        {/* Usage Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-5 text-center border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">1</span>
            </div>
            <h3 className="font-semibold text-white text-sm mb-2">Define Concept</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Enter your project idea and requirements</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-5 text-center border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">2</span>
            </div>
            <h3 className="font-semibold text-white text-sm mb-2">Browse Mockups</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Navigate to any URL to generate instant page mockups</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-5 text-center border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">3</span>
            </div>
            <h3 className="font-semibold text-white text-sm mb-2">Export Concept</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Download your mockups for presentations or development</p>
          </div>
        </div>

        {/* Main form */}
        <Card className="bg-slate-800/80 backdrop-blur shadow-2xl border-slate-700/50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Create Your Concept
            </CardTitle>
            <CardDescription className="text-slate-300">
              Start with a project type or enter your own. Add context to guide the mockup generation.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="project-name" className="text-sm font-semibold text-slate-200 block">
                Project Type
              </label>
              {isGenerating ? (
                <div className="h-11 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-md bg-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-100"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse animation-delay-200"></div>
                    <span className="ml-3 text-slate-300 font-medium">
                      {currentSpinnerName || "Generating..."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter your project name"
                      className="flex-1 h-11 text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500 focus:bg-slate-700/70"
                    />
                    <Button
                      type="button"
                      onClick={handleRegenerateProject}
                      variant="outline"
                      className="h-11 px-4 bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 hover:border-slate-500"
                    >
                      ↻
                    </Button>
                  </div>
                  <p className="text-sm text-slate-400">
                    Click the refresh button to generate a new project type
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <label htmlFor="instructions" className="text-sm font-semibold text-slate-200 block">
                Project Requirements <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Describe your vision: What features should it have? What's the target audience? Any specific functionality or design preferences..."
                className="min-h-[100px] text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500 focus:bg-slate-700/70 resize-none"
                disabled={isGenerating}
              />
              <p className="text-sm text-slate-400">
                Detailed requirements help create more relevant and useful content
              </p>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
              <h4 className="font-semibold text-slate-200 mb-2">How it works</h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Generate instant mockups for rapid ideation</li>
                <li>• Navigate to any URL path to create new page concepts</li>
                <li>• Perfect for brainstorming and client presentations</li>
                <li>• Export your concepts when ready</li>
              </ul>
            </div>
          </CardContent>
          
          <CardFooter className="pt-6">
            <Button 
              onClick={handleConfirm}
              disabled={isGenerating || !projectName.trim()}
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
            >
              {isGenerating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                "Generate Mockup"
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center mt-6 text-slate-400 text-sm">
          <p>
            Instant Ideation • Session-based • No data storage
          </p>
        </div>
      </div>
    </div>
  );
}
