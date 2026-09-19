import { useCallback, useEffect, useReducer, useRef } from "react";
import { analysisReducer, initialAnalysisState } from "../domain/analysisMachine";
import { SCENARIOS } from "../domain/scenarios";
import type { AttachmentMeta, ScenarioName } from "../domain/analysisTypes";
import { fixtureResult } from "../test/fixtures";

export function useAnalysisSimulation() {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const stateRef = useRef(state);
  const attachmentRef = useRef<AttachmentMeta | null>(null);
  const scenarioRef = useRef<ScenarioName>("normal");
  const runCounter = useRef(0);
  const timeoutIds = useRef<number[]>([]);
  const intervalIds = useRef<number[]>([]);

  const clearScheduledWork = useCallback(() => {
    timeoutIds.current.forEach(window.clearTimeout);
    intervalIds.current.forEach(window.clearInterval);
    timeoutIds.current = [];
    intervalIds.current = [];
  }, []);

  const schedule = useCallback(
    (callback: () => void, delay: number) => {
      const id = window.setTimeout(callback, delay);
      timeoutIds.current.push(id);
    },
    [],
  );

  const schedulePipeline = useCallback(
    (runId: number, scenarioName: ScenarioName, retryCount: number, fromRetry = false) => {
      const scenario = SCENARIOS[scenarioName];
      const startRecognition = () => {
        dispatch({ type: "ADVANCE", runId, phase: "recognizing" });
        if (scenario.warningMs !== null) {
          schedule(() => dispatch({ type: "SHOW_LONG_WAIT", runId }), scenario.warningMs);
        }
        schedule(() => {
          if (scenario.failAt === "recognizing" && !(retryCount > 0 && scenario.retrySucceeds)) {
            dispatch({
              type: "FAIL",
              runId,
              error: {
                stage: "recognition",
                code: "recognition_failed",
                message: "Your image was received, but item recognition could not be completed.",
                recoverable: true,
              },
            });
            return;
          }
          dispatch({ type: "ADVANCE", runId, phase: "estimating" });
          schedule(
            () => {
              dispatch({ type: "ADVANCE", runId, phase: "preparing" });
              schedule(() => dispatch({ type: "COMPLETE", runId, result: fixtureResult }), scenario.durationsMs.preparing);
            },
            scenario.durationsMs.estimating,
          );
        }, scenario.durationsMs.recognizing);
      };

      if (fromRetry) {
        startRecognition();
      } else {
        dispatch({ type: "ADVANCE", runId, phase: "validating" });
        schedule(startRecognition, scenario.durationsMs.validating);
      }
    },
    [schedule],
  );

  const start = useCallback(() => {
    const attachment = attachmentRef.current ?? stateRef.current.attachment;
    if (!attachment) return;
    clearScheduledWork();
    const runId = Math.max(runCounter.current, stateRef.current.runId) + 1;
    runCounter.current = runId;
    const scenarioName = scenarioRef.current;
    dispatch({ type: "START", runId });
    const scenario = SCENARIOS[scenarioName];
    let progress = 0;
    const uploadId = window.setInterval(() => {
      progress = Math.min(100, progress + scenario.uploadStep);
      dispatch({ type: "UPLOAD_PROGRESS", runId, progress });
      if (progress >= 100) {
        window.clearInterval(uploadId);
        schedulePipeline(runId, scenarioName, 0);
      }
    }, scenario.uploadTickMs);
    intervalIds.current.push(uploadId);
    const elapsedId = window.setInterval(() => {
      dispatch({ type: "TICK", runId, elapsedMs: stateRef.current.elapsedMs + 100 });
    }, 100);
    intervalIds.current.push(elapsedId);
  }, [clearScheduledWork, schedulePipeline]);

  const selectAttachment = useCallback(
    (attachment: AttachmentMeta) => {
      clearScheduledWork();
      attachmentRef.current = attachment;
      dispatch({ type: "SELECT_FILE", attachment });
    },
    [clearScheduledWork],
  );

  const removeAttachment = useCallback(() => {
    clearScheduledWork();
    attachmentRef.current = null;
    dispatch({ type: "REMOVE_FILE" });
  }, [clearScheduledWork]);

  const setDraft = useCallback((draft: string) => dispatch({ type: "SET_DRAFT", draft }), []);

  const setScenario = useCallback((scenario: ScenarioName) => {
    scenarioRef.current = scenario;
    dispatch({ type: "SET_SCENARIO", scenario });
  }, []);

  const cancel = useCallback(() => {
    clearScheduledWork();
    dispatch({ type: "CANCEL", runId: runCounter.current });
  }, [clearScheduledWork]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (!current.attachment || !current.error) return;
    clearScheduledWork();
    const runId = Math.max(runCounter.current, current.runId) + 1;
    runCounter.current = runId;
    dispatch({ type: "RETRY", runId });
    const elapsedId = window.setInterval(() => {
      dispatch({ type: "TICK", runId, elapsedMs: stateRef.current.elapsedMs + 100 });
    }, 100);
    intervalIds.current.push(elapsedId);
    schedulePipeline(runId, current.scenario, current.retryCount + 1, true);
  }, [clearScheduledWork, schedulePipeline]);

  const keepWaiting = useCallback(() => dispatch({ type: "DISMISS_LONG_WAIT" }), []);
  const openManualEntry = useCallback(() => dispatch({ type: "OPEN_MANUAL_ENTRY" }), []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => clearScheduledWork, [clearScheduledWork]);

  return {
    state,
    selectAttachment,
    removeAttachment,
    setDraft,
    setScenario,
    start,
    cancel,
    retry,
    keepWaiting,
    openManualEntry,
  };
}
