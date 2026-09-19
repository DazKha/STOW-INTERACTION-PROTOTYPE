export type AnalysisPhase =
  | "idle"
  | "selected"
  | "uploading"
  | "validating"
  | "recognizing"
  | "estimating"
  | "preparing"
  | "completed"
  | "error"
  | "cancelled"
  | "manual_entry";

export type ScenarioName = "normal" | "slow" | "failure";

export interface AttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  previewUrl: string;
}

export interface AnalysisError {
  stage: "validation" | "recognition";
  code: "unsupported_type" | "too_large" | "empty_file" | "decode_failed" | "recognition_failed";
  message: string;
  recoverable: boolean;
}

export interface DemoResult {
  item: string;
  dimensionsM: [number, number, number];
  volumeM3: number;
  confidence: "Medium";
}

export interface AnalysisState {
  phase: AnalysisPhase;
  runId: number;
  attachment: AttachmentMeta | null;
  draft: string;
  scenario: ScenarioName;
  uploadProgress: number;
  elapsedMs: number;
  longWait: boolean;
  longWaitDismissed: boolean;
  error: AnalysisError | null;
  result: DemoResult | null;
  manualEntryOpen: boolean;
  retryCount: number;
}

export type AnalysisEvent =
  | { type: "SELECT_FILE"; attachment: AttachmentMeta }
  | { type: "REMOVE_FILE" }
  | { type: "SET_DRAFT"; draft: string }
  | { type: "SET_SCENARIO"; scenario: ScenarioName }
  | { type: "START"; runId: number }
  | { type: "UPLOAD_PROGRESS"; runId: number; progress: number }
  | { type: "ADVANCE"; runId: number; phase: Exclude<AnalysisPhase, "idle" | "selected" | "error" | "cancelled"> }
  | { type: "TICK"; runId: number; elapsedMs: number }
  | { type: "SHOW_LONG_WAIT"; runId: number }
  | { type: "DISMISS_LONG_WAIT" }
  | { type: "FAIL"; runId: number; error: AnalysisError }
  | { type: "RETRY"; runId: number }
  | { type: "CANCEL"; runId: number }
  | { type: "OPEN_MANUAL_ENTRY"; runId: number }
  | { type: "COMPLETE"; runId: number; result: DemoResult };
