import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { generateRandomName } from "@/utils/nameGenerator";
import { RotateCw, ArrowRight, Terminal, Zap, Download } from "lucide-react";

interface InitialSetupProps {
  onConfirm: (name: string, instructions: string) => void;
}

export function InitialSetup({ onConfirm }: InitialSetupProps) {
  const [projectName, setProjectName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [currentSpinnerName, setCurrentSpinnerName] = useState("");

  useEffect(() => {
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
    <div className="min-h-screen bg-[#05080a] grid-bg noise-bg relative overflow-hidden">
      <div className="crt-overlay" />

      {/* Ambient glow spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff9d]/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00b8ff]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12 animate-[fade-in-up_0.6s_ease-out]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,255,157,0.15)] bg-[rgba(0,255,157,0.05)] mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
              <span className="text-[#00ff9d] text-xs font-mono uppercase tracking-wider">system online</span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl font-800 text-white mb-4 tracking-tight leading-none">
              <span className="text-[#00ff9d] glow-green">this</span>project<br />
              does<span className="text-[#4a6274]">not</span>exist
            </h1>

            <p className="text-[#4a6274] text-base font-mono max-w-md mx-auto">
              name a project. navigate to any url. watch websites materialize from nothing.
            </p>
          </div>

          {/* How it works - minimal inline */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mb-10 animate-[fade-in-up_0.6s_0.1s_ease-out_both]">
            {[
              { icon: Terminal, label: "name it" },
              { icon: Zap, label: "navigate" },
              { icon: Download, label: "export" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[#4a6274]">
                  <Icon className="w-4 h-4 text-[#00ff9d]/60" />
                  <span className="text-xs font-mono">{label}</span>
                </div>
                {i < 2 && <span className="text-[#00ff9d]/20 text-xs">//</span>}
              </div>
            ))}
          </div>

          {/* Main form card */}
          <div className="animate-[fade-in-up_0.6s_0.2s_ease-out_both]">
            <div className="bg-[#0a1018]/80 backdrop-blur-sm border border-[rgba(0,255,157,0.1)] rounded-lg overflow-hidden glow-box-green">
              {/* Terminal title bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(0,255,157,0.08)] bg-[#0a1018]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e]/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffd700]/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00ff9d]/60" />
                </div>
                <span className="text-[#4a6274] text-xs font-mono ml-2">fabricate.exe</span>
              </div>

              <div className="p-6 space-y-5">
                {/* Project name */}
                <div className="space-y-2">
                  <label htmlFor="project-name" className="text-xs text-[#4a6274] font-mono uppercase tracking-wider block">
                    project_name
                  </label>
                  {isGenerating ? (
                    <div className="h-11 flex items-center px-4 border border-dashed border-[rgba(0,255,157,0.15)] rounded-md bg-[#0f1923]/60">
                      <span className="text-[#00ff9d]/40 mr-2 font-mono">{'>'}</span>
                      <span className="text-[#c8d6e5] font-mono animate-[fade-in_0.2s_ease-out]" key={currentSpinnerName}>
                        {currentSpinnerName || "scanning..."}
                      </span>
                      <span className="ml-1 w-2 h-5 bg-[#00ff9d] animate-[terminal-blink_0.8s_step-end_infinite]" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00ff9d]/40 font-mono">{'>'}</span>
                        <Input
                          id="project-name"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="enter project name"
                          className="pl-7 h-11 text-base bg-[#0f1923]/60 border-[rgba(0,255,157,0.12)] text-[#c8d6e5] placeholder:text-[#4a6274]/50 focus:border-[#00ff9d]/40 focus:shadow-[0_0_10px_rgba(0,255,157,0.1)] transition-all duration-300 font-mono"
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleRegenerateProject}
                        variant="outline"
                        className="h-11 w-11 p-0 bg-[#0f1923]/60 border-[rgba(0,255,157,0.12)] text-[#00ff9d]/60 hover:text-[#00ff9d] hover:bg-[#0f1923] hover:border-[#00ff9d]/30 transition-all duration-300"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <label htmlFor="instructions" className="text-xs text-[#4a6274] font-mono uppercase tracking-wider block">
                    instructions <span className="text-[#4a6274]/40 normal-case">(optional)</span>
                  </label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="describe what you want the site to be like..."
                    className="min-h-[80px] text-sm bg-[#0f1923]/60 border-[rgba(0,255,157,0.12)] text-[#c8d6e5] placeholder:text-[#4a6274]/50 focus:border-[#00ff9d]/40 focus:shadow-[0_0_10px_rgba(0,255,157,0.1)] resize-none transition-all duration-300 font-mono"
                    disabled={isGenerating}
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleConfirm}
                  disabled={isGenerating || !projectName.trim()}
                  className="w-full h-11 text-sm font-mono font-semibold bg-[#00ff9d] text-[#05080a] hover:bg-[#00ff9d]/90 hover:shadow-[0_0_20px_rgba(0,255,157,0.3)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-[#05080a] border-t-transparent rounded-full animate-spin" />
                      scanning...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      fabricate
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[#4a6274]/40 text-xs font-mono mt-8 animate-[fade-in_1s_0.5s_ease-out_both]">
            instant generation // session-based // nothing is stored
          </p>
        </div>
      </div>
    </div>
  );
}
