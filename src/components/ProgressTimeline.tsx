import type { AnalysisPhase, AnalysisState } from "../domain/analysisTypes";

const stages: Array<{ phase: Exclude<AnalysisPhase, "idle" | "selected" | "error" | "cancelled">; label: string }> = [
  { phase: "uploading", label: "Uploading image" },
  { phase: "validating", label: "Checking image quality" },
  { phase: "recognizing", label: "Recognizing the item" },
  { phase: "estimating", label: "Estimating dimensions" },
  { phase: "preparing", label: "Preparing recommendation" },
  { phase: "completed", label: "Complete" },
];

interface ProgressTimelineProps {
  state: AnalysisState;
}

export function ProgressTimeline({ state }: ProgressTimelineProps) {
  const activeIndex = stages.findIndex((stage) => stage.phase === state.phase);
  return (
    <section className="progress-panel" aria-labelledby="progress-heading">
      <div className="progress-header">
        <h2 id="progress-heading">Analysis progress</h2>
        <span>Elapsed {Math.floor(state.elapsedMs / 1000)}s</span>
      </div>
      <ol>
        {stages.map((stage, index) => {
          const status = state.phase === "completed" || index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending";
          return (
            <li key={stage.phase} data-status={status}>
              <span aria-hidden="true">{status === "complete" ? "✓" : status === "active" ? "•" : "○"}</span>
              <span>{stage.label}</span>
              <small>{status === "complete" ? "Complete" : status === "active" ? "In progress" : "Waiting"}</small>
              {stage.phase === "uploading" && state.phase === "uploading" && (
                <div role="progressbar" aria-label="Image upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.uploadProgress}>
                  <span style={{ width: `${state.uploadProgress}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
