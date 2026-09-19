import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureAttachment } from "../test/fixtures";
import { useAnalysisSimulation } from "./useAnalysisSimulation";

describe("useAnalysisSimulation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("completes the normal scenario", () => {
    const { result } = renderHook(() => useAnalysisSimulation());

    act(() => {
      result.current.selectAttachment(fixtureAttachment);
      result.current.start();
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.state.phase).toBe("completed");
    expect(result.current.state.result?.item).toBe("City bicycle with basket");
  });

  it("shows long-wait controls while the slow scenario remains in recognition", () => {
    const { result } = renderHook(() => useAnalysisSimulation());

    act(() => {
      result.current.selectAttachment(fixtureAttachment);
      result.current.setScenario("slow");
      result.current.start();
      vi.advanceTimersByTime(3200);
    });

    expect(result.current.state.phase).toBe("recognizing");
    expect(result.current.state.longWait).toBe(true);
  });

  it("fails at recognition in the failure scenario", () => {
    const { result } = renderHook(() => useAnalysisSimulation());

    act(() => {
      result.current.selectAttachment(fixtureAttachment);
      result.current.setScenario("failure");
      result.current.start();
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.state.phase).toBe("error");
    expect(result.current.state.error?.stage).toBe("recognition");
  });

  it("retries recognition without returning to uploading", () => {
    const { result } = renderHook(() => useAnalysisSimulation());

    act(() => {
      result.current.selectAttachment(fixtureAttachment);
      result.current.setScenario("failure");
      result.current.start();
      vi.advanceTimersByTime(2500);
    });

    act(() => {
      result.current.retry();
    });

    expect(result.current.state.phase).toBe("recognizing");
    expect(result.current.state.uploadProgress).toBe(100);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.state.phase).toBe("completed");
  });

  it("does not complete after cancellation even when all timers run", () => {
    const { result } = renderHook(() => useAnalysisSimulation());

    act(() => {
      result.current.selectAttachment(fixtureAttachment);
      result.current.start();
      result.current.cancel();
      vi.runAllTimers();
    });

    expect(result.current.state.phase).toBe("cancelled");
    expect(result.current.state.result).toBeNull();
  });

  it("ignores callbacks from a previous run after the attachment is replaced", () => {
    const replacement = { ...fixtureAttachment, id: "fixture-image-2", name: "chair.png" };
    const { result } = renderHook(() => useAnalysisSimulation());

    act(() => {
      result.current.selectAttachment(fixtureAttachment);
      result.current.start();
      result.current.selectAttachment(replacement);
      vi.runAllTimers();
    });

    expect(result.current.state.phase).toBe("selected");
    expect(result.current.state.attachment?.name).toBe("chair.png");
    expect(result.current.state.result).toBeNull();
  });
});
