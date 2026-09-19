import { describe, expect, it } from "vitest";
import { analysisReducer, initialAnalysisState } from "./analysisMachine";
import type { AttachmentMeta } from "./analysisTypes";
import { fixtureResult } from "../test/fixtures";

const attachment: AttachmentMeta = {
  id: "image-1",
  name: "bike.png",
  type: "image/png",
  size: 1024,
  width: 1200,
  height: 800,
  previewUrl: "blob:image-1",
};

describe("analysisReducer", () => {
  it("starts only when a file is selected", () => {
    const untouched = analysisReducer(initialAnalysisState, { type: "START", runId: 1 });
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const started = analysisReducer(selected, { type: "START", runId: 1 });

    expect(untouched.phase).toBe("idle");
    expect(started.phase).toBe("uploading");
  });

  it("ignores runtime events from a stale run id", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const runOne = analysisReducer(selected, { type: "START", runId: 1 });
    const runTwo = analysisReducer(runOne, { type: "START", runId: 2 });
    const stale = analysisReducer(runTwo, { type: "COMPLETE", runId: 1, result: fixtureResult });

    expect(stale.phase).toBe("uploading");
    expect(stale.runId).toBe(2);
  });

  it("keeps the draft when analysis is cancelled", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const drafted = analysisReducer(selected, { type: "SET_DRAFT", draft: "Please store this bike" });
    const started = analysisReducer(drafted, { type: "START", runId: 1 });
    const cancelled = analysisReducer(started, { type: "CANCEL", runId: 1 });

    expect(cancelled.phase).toBe("cancelled");
    expect(cancelled.draft).toBe("Please store this bike");
  });

  it("keeps the attachment and resumes at recognition on retry", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const started = analysisReducer(selected, { type: "START", runId: 1 });
    const recognizing = analysisReducer(started, { type: "ADVANCE", runId: 1, phase: "recognizing" });
    const failed = analysisReducer(recognizing, {
      type: "FAIL",
      runId: 1,
      error: { stage: "recognition", code: "recognition_failed", message: "failed", recoverable: true },
    });
    const retried = analysisReducer(failed, { type: "RETRY", runId: 2 });

    expect(retried.phase).toBe("recognizing");
    expect(retried.attachment).toBe(attachment);
    expect(retried.uploadProgress).toBe(0);
    expect(retried.retryCount).toBe(1);
  });

  it("restarts recognition from a long-wait state without replaying upload", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const drafted = analysisReducer(selected, { type: "SET_DRAFT", draft: "Keep this message" });
    const started = analysisReducer(drafted, { type: "START", runId: 1 });
    const recognizing = analysisReducer(started, { type: "ADVANCE", runId: 1, phase: "recognizing" });
    const waiting = analysisReducer(recognizing, { type: "SHOW_LONG_WAIT", runId: 1 });
    const retried = analysisReducer(waiting, { type: "RETRY", runId: 2 });

    expect(retried.phase).toBe("recognizing");
    expect(retried.runId).toBe(2);
    expect(retried.attachment).toBe(attachment);
    expect(retried.draft).toBe("Keep this message");
    expect(retried.uploadProgress).toBe(0);
    expect(retried.elapsedMs).toBe(0);
    expect(retried.longWait).toBe(false);
  });

  it("never completes after cancellation from the same run", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const started = analysisReducer(selected, { type: "START", runId: 1 });
    const cancelled = analysisReducer(started, { type: "CANCEL", runId: 1 });
    const completed = analysisReducer(cancelled, { type: "COMPLETE", runId: 1, result: fixtureResult });

    expect(completed.phase).toBe("cancelled");
    expect(completed.result).toBeNull();
  });

  it("clears result and processing state when the file is removed", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const started = analysisReducer(selected, { type: "START", runId: 1 });
    const removed = analysisReducer(started, { type: "REMOVE_FILE" });

    expect(removed.phase).toBe("idle");
    expect(removed.attachment).toBeNull();
    expect(removed.result).toBeNull();
  });

  it("represents long wait without replacing the active phase", () => {
    const selected = analysisReducer(initialAnalysisState, { type: "SELECT_FILE", attachment });
    const started = analysisReducer(selected, { type: "START", runId: 1 });
    const recognizing = analysisReducer(started, { type: "ADVANCE", runId: 1, phase: "recognizing" });
    const waiting = analysisReducer(recognizing, { type: "SHOW_LONG_WAIT", runId: 1 });

    expect(waiting.phase).toBe("recognizing");
    expect(waiting.longWait).toBe(true);
  });
});
