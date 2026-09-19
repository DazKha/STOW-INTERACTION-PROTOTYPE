import type { AnalysisEvent, AnalysisState } from "./analysisTypes";

export const initialAnalysisState: AnalysisState = {
  phase: "idle",
  runId: 0,
  attachment: null,
  draft: "",
  scenario: "normal",
  uploadProgress: 0,
  elapsedMs: 0,
  longWait: false,
  longWaitDismissed: false,
  error: null,
  result: null,
  manualEntryOpen: false,
  retryCount: 0,
};

export function isProcessingPhase(phase: AnalysisState["phase"]): boolean {
  return ["uploading", "validating", "recognizing", "estimating", "preparing"].includes(phase);
}

export function analysisReducer(state: AnalysisState, event: AnalysisEvent): AnalysisState {
  const guardedEvent = !["START", "RETRY", "OPEN_MANUAL_ENTRY"].includes(event.type) && "runId" in event;
  if (guardedEvent && event.runId !== state.runId) {
    return state;
  }

  switch (event.type) {
    case "SELECT_FILE":
      return {
        ...state,
        phase: "selected",
        runId: state.runId + 1,
        attachment: event.attachment,
        uploadProgress: 0,
        elapsedMs: 0,
        longWait: false,
        longWaitDismissed: false,
        error: null,
        result: null,
        manualEntryOpen: false,
        retryCount: 0,
      };
    case "REMOVE_FILE":
      return { ...initialAnalysisState, draft: state.draft, scenario: state.scenario, runId: state.runId + 1 };
    case "SET_DRAFT":
      return { ...state, draft: event.draft };
    case "SET_SCENARIO":
      return { ...state, scenario: event.scenario };
    case "START":
      if (!state.attachment) return state;
      return {
        ...state,
        phase: "uploading",
        runId: event.runId,
        uploadProgress: 0,
        elapsedMs: 0,
        longWait: false,
        longWaitDismissed: false,
        error: null,
        result: null,
        manualEntryOpen: false,
      };
    case "UPLOAD_PROGRESS":
      if (state.phase !== "uploading") return state;
      return { ...state, uploadProgress: Math.min(100, Math.max(0, event.progress)) };
    case "ADVANCE":
      return { ...state, phase: event.phase, error: null };
    case "TICK":
      if (!isProcessingPhase(state.phase)) return state;
      return { ...state, elapsedMs: event.elapsedMs };
    case "SHOW_LONG_WAIT":
      return { ...state, longWait: true, longWaitDismissed: false };
    case "DISMISS_LONG_WAIT":
      return { ...state, longWaitDismissed: true };
    case "FAIL":
      return { ...state, phase: "error", error: event.error, longWait: false };
    case "RETRY":
      if (!state.attachment) return state;
      if (state.error?.stage !== "recognition" && !(state.phase === "recognizing" && state.longWait)) return state;
      return {
        ...state,
        phase: "recognizing",
        runId: event.runId,
        elapsedMs: 0,
        longWait: false,
        longWaitDismissed: false,
        error: null,
        result: null,
        manualEntryOpen: false,
        retryCount: state.retryCount + 1,
      };
    case "CANCEL":
      return { ...state, phase: "cancelled", runId: state.runId + 1, longWait: false };
    case "OPEN_MANUAL_ENTRY":
      if (!state.attachment) return state;
      return {
        ...state,
        phase: "manual_entry",
        runId: event.runId,
        longWait: false,
        longWaitDismissed: false,
        error: null,
        result: null,
        manualEntryOpen: true,
      };
    case "COMPLETE":
      if (state.phase !== "preparing") return state;
      return { ...state, phase: "completed", result: event.result, error: null, longWait: false };
  }
}
