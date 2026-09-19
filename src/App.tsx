import { useEffect, useRef, useState } from "react";
import { ImageComposer } from "./components/ImageComposer";
import { useAnalysisSimulation } from "./hooks/useAnalysisSimulation";
import { validateImageFile } from "./lib/imageValidation";

export default function App() {
  const simulation = useAnalysisSimulation();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const handleFile = async (file: File) => {
    setValidationMessage(null);
    try {
      const attachment = await validateImageFile(file);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = attachment.previewUrl;
      simulation.selectAttachment(attachment);
    } catch (error) {
      if (typeof error === "object" && error !== null && "error" in error) {
        setValidationMessage(String((error as { error: { message: string } }).error.message));
      } else {
        setValidationMessage("The image could not be selected.");
      }
    }
  };

  const handleRemove = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    simulation.removeAttachment();
  };

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  return (
    <main>
      <header>
        <p>STOW interaction prototype</p>
        <h1>Image analysis progress</h1>
        <p>Prototype - simulated processing</p>
        <p>This prototype validates your file locally. The AI processing stages and final recognition result are simulated for UX evaluation.</p>
      </header>
      <ImageComposer
        state={simulation.state}
        validationMessage={validationMessage}
        onFile={handleFile}
        onRemove={handleRemove}
        onDraft={simulation.setDraft}
        onScenario={simulation.setScenario}
        onAnalyze={simulation.start}
      />
    </main>
  );
}
