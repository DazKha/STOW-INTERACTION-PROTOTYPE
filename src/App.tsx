import { useEffect, useRef, useState } from "react";
import { ImageComposer } from "./components/ImageComposer";
import { LongWaitPanel } from "./components/LongWaitPanel";
import { ManualDetailsForm } from "./components/ManualDetailsForm";
import { ProgressTimeline } from "./components/ProgressTimeline";
import { ResultCard } from "./components/ResultCard";
import { useAnalysisSimulation } from "./hooks/useAnalysisSimulation";
import { isProcessingPhase } from "./domain/analysisMachine";
import { validateImageFile } from "./lib/imageValidation";

export default function App() {
  const simulation = useAnalysisSimulation();
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [manualConfirmation, setManualConfirmation] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const handleFile = async (file: File) => {
    if (isProcessingPhase(simulation.state.phase)) return;
    setValidationMessage(null);
    setManualConfirmation(null);
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
    if (isProcessingPhase(simulation.state.phase)) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    simulation.removeAttachment();
    setManualConfirmation(null);
  };

  const handleManualSubmit = (itemName: string) => {
    setManualConfirmation(`Details saved for manual sizing: ${itemName}.`);
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
        isProcessing={isProcessingPhase(simulation.state.phase)}
      />
      {(simulation.state.phase !== "idle" && simulation.state.phase !== "selected") && (
        <>
          <ProgressTimeline state={simulation.state} />
          {simulation.state.longWait && !simulation.state.longWaitDismissed && (
            <LongWaitPanel
              onKeepWaiting={simulation.keepWaiting}
              onRetry={simulation.retry}
              onCancel={simulation.cancel}
              onManual={simulation.openManualEntry}
            />
          )}
          {simulation.state.longWait && simulation.state.longWaitDismissed && <p role="status" aria-live="polite">Still working in the background.</p>}
          {simulation.state.phase === "recognizing" && !simulation.state.longWait && (
            <button type="button" onClick={simulation.cancel} aria-label="Cancel image analysis">Cancel</button>
          )}
          {simulation.state.phase === "cancelled" && <p role="status" aria-live="polite">Cancelled. Your image and message remain available.</p>}
          {simulation.state.phase === "error" && simulation.state.error && (
            <section role="alert" aria-labelledby="error-heading">
              <h2 id="error-heading">Recognition could not be completed</h2>
              <p>{simulation.state.error.message}</p>
              <button type="button" onClick={simulation.retry}>Retry analysis</button>
              <button type="button" onClick={simulation.openManualEntry}>Enter details manually</button>
              <button type="button" onClick={handleRemove}>Choose another image</button>
            </section>
          )}
          {simulation.state.manualEntryOpen && (
            <>
              <ManualDetailsForm onSubmit={handleManualSubmit} />
              {manualConfirmation && <p role="status" aria-live="polite">{manualConfirmation}</p>}
            </>
          )}
          {simulation.state.phase === "completed" && simulation.state.result && <ResultCard result={simulation.state.result} />}
        </>
      )}
    </main>
  );
}
