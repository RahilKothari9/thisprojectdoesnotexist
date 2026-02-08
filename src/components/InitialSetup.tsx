import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { generateRandomName } from "@/utils/nameGenerator";
import { ArcaneBackground } from "@/components/arcane/ArcaneBackground";
import { ArcaneDivider } from "@/components/arcane/ArcaneDivider";
import { Feather, Sparkles, BookOpen, RotateCw } from "lucide-react";

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
    <ArcaneBackground>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl mx-auto">

          {/* Hero Section */}
          <div className="text-center mb-10">
            <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-[#d4a843] text-gold-shimmer mb-4 tracking-wide">
              ThisProjectDoesNotExist
            </h1>
            <ArcaneDivider className="my-5 mx-auto" />
            <p className="text-[#e8dcc8] text-lg italic opacity-80">
              Conjure websites from nothing but imagination
            </p>
          </div>

          {/* 3 Rune Stones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              { icon: Feather, label: "Inscribe", description: "Name your creation" },
              { icon: Sparkles, label: "Conjure", description: "Navigate to summon pages" },
              { icon: BookOpen, label: "Bind", description: "Export your grimoire" },
            ].map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="bg-[#1e1233]/60 backdrop-blur rounded-xl p-6 text-center border border-[rgba(139,92,246,0.15)] hover:border-[rgba(212,168,67,0.3)] hover:shadow-[0_0_20px_rgba(212,168,67,0.1)] transition-all duration-500 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#2a1845] flex items-center justify-center mx-auto mb-3 group-hover:shadow-[0_0_15px_rgba(212,168,67,0.3)] transition-shadow duration-500">
                  <Icon className="w-5 h-5 text-[#d4a843]" />
                </div>
                <h3 className="font-cinzel text-[#f0c75e] font-bold text-sm mb-1">{label}</h3>
                <p className="text-[#9a8c7a] text-xs">{description}</p>
              </div>
            ))}
          </div>

          {/* Conjuring Form */}
          <Card className="bg-[#1e1233]/80 backdrop-blur-sm border-[rgba(139,92,246,0.15)] shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-cinzel text-2xl text-[#f0c75e]">
                The Conjuring Circle
              </CardTitle>
              <CardDescription className="text-[#9a8c7a]">
                Name your creation and whisper your requirements
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Name Oracle */}
              <div className="space-y-2">
                <label htmlFor="project-name" className="text-sm text-[#e8dcc8] rune-label block">
                  Project Oracle
                </label>
                {isGenerating ? (
                  <div className="h-11 flex items-center justify-center border border-dashed border-[rgba(139,92,246,0.3)] rounded-md bg-[#2a1845]/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[#d4a843] rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-[#d4a843] rounded-full animate-pulse animation-delay-100"></div>
                      <div className="w-2 h-2 bg-[#d4a843] rounded-full animate-pulse animation-delay-200"></div>
                      <span className="ml-3 text-[#e8dcc8] font-medium animate-[fade-in-left_0.3s_ease-out]" key={currentSpinnerName}>
                        {currentSpinnerName || "Divining..."}
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
                        className="flex-1 h-11 text-base bg-[#2a1845]/50 border-[rgba(139,92,246,0.2)] text-[#e8dcc8] placeholder:text-[#9a8c7a]/60 focus:border-[#d4a843] focus:shadow-[0_0_10px_rgba(212,168,67,0.15)] transition-all duration-300"
                      />
                      <Button
                        type="button"
                        onClick={handleRegenerateProject}
                        variant="outline"
                        className="h-11 px-3 bg-[#2a1845]/50 border-[rgba(139,92,246,0.2)] text-[#d4a843] hover:bg-[#2a1845] hover:border-[#d4a843]/50 hover:shadow-[0_0_10px_rgba(212,168,67,0.15)] transition-all duration-300"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-[#9a8c7a]">
                      Click the rune to divine a new project type
                    </p>
                  </div>
                )}
              </div>

              {/* Incantation Details */}
              <div className="space-y-2">
                <label htmlFor="instructions" className="text-sm text-[#e8dcc8] rune-label block">
                  Incantation Details <span className="text-[#9a8c7a]/60 font-normal normal-case tracking-normal">(Optional)</span>
                </label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Describe your vision and the spirits shall obey..."
                  className="min-h-[100px] text-base bg-[#2a1845]/50 border-[rgba(139,92,246,0.2)] text-[#e8dcc8] placeholder:text-[#9a8c7a]/60 focus:border-[#d4a843] focus:shadow-[0_0_10px_rgba(212,168,67,0.15)] resize-none transition-all duration-300"
                  disabled={isGenerating}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                onClick={handleConfirm}
                disabled={isGenerating || !projectName.trim()}
                className="w-full h-12 text-base font-cinzel font-bold bg-gradient-to-r from-[#d4a843] to-[#f0c75e] text-[#0a0612] border-0 shadow-[0_0_20px_rgba(212,168,67,0.3)] hover:shadow-[0_0_30px_rgba(212,168,67,0.5)] transition-all duration-500 disabled:opacity-40"
              >
                {isGenerating ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-[#0a0612] border-t-transparent rounded-full animate-spin"></div>
                    <span>Divining...</span>
                  </div>
                ) : (
                  "Begin Conjuration"
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Footer */}
          <p className="text-center text-[#9a8c7a] text-sm mt-8 rune-label">
            Instant Conjuration · Session-Based · No Data Stored
          </p>
        </div>
      </div>
    </ArcaneBackground>
  );
}
