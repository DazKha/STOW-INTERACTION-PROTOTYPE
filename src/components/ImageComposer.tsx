import type { ChangeEvent, DragEvent } from "react";
import type { AnalysisState, ScenarioName } from "../domain/analysisTypes";
import { AttachmentCard } from "./AttachmentCard";
import { ScenarioSelector } from "./ScenarioSelector";

interface ImageComposerProps {
  state: AnalysisState;
  validationMessage: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onDraft: (draft: string) => void;
  onScenario: (scenario: ScenarioName) => void;
  onAnalyze: () => void;
}

export function ImageComposer({ state, validationMessage, onFile, onRemove, onDraft, onScenario, onAnalyze }: ImageComposerProps) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <section className="composer" aria-label="Image analysis composer">
      <label htmlFor="message">Message</label>
      <textarea id="message" value={state.draft} onChange={(event) => onDraft(event.target.value)} rows={3} />
      <div className="composer-controls">
        <ScenarioSelector value={state.scenario} onChange={onScenario} />
        <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <label htmlFor="image-input">Choose an image</label>
          <input id="image-input" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleInput} />
          <span>or drop a JPG, PNG, or WebP here</span>
        </div>
      </div>
      {validationMessage && <p role="alert">{validationMessage}</p>}
      <p className="sr-only" role="status" aria-live="polite">{validationMessage ?? (state.attachment ? "Image ready to analyze." : "Choose an image to begin.")}</p>
      {state.attachment && <AttachmentCard attachment={state.attachment} onRemove={onRemove} />}
      <button type="button" onClick={onAnalyze} disabled={!state.attachment || state.phase === "uploading"}>
        Analyze image
      </button>
    </section>
  );
}
