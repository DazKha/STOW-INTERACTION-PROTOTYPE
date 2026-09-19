import type { ScenarioName } from "./analysisTypes";

export interface ScenarioConfig {
  warningMs: number | null;
  uploadTickMs: number;
  uploadStep: number;
  durationsMs: {
    validating: number;
    recognizing: number;
    estimating: number;
    preparing: number;
  };
  failAt: "recognizing" | null;
  retrySucceeds: boolean;
}

export const SCENARIOS: Record<ScenarioName, ScenarioConfig> = {
  normal: {
    warningMs: null,
    uploadTickMs: 80,
    uploadStep: 20,
    durationsMs: { validating: 300, recognizing: 900, estimating: 700, preparing: 500 },
    failAt: null,
    retrySucceeds: true,
  },
  slow: {
    warningMs: 2000,
    uploadTickMs: 100,
    uploadStep: 20,
    durationsMs: { validating: 400, recognizing: 6000, estimating: 900, preparing: 600 },
    failAt: null,
    retrySucceeds: true,
  },
  failure: {
    warningMs: null,
    uploadTickMs: 80,
    uploadStep: 20,
    durationsMs: { validating: 300, recognizing: 1000, estimating: 700, preparing: 500 },
    failAt: "recognizing",
    retrySucceeds: true,
  },
};
