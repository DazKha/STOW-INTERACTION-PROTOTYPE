# STOW Image Analysis Progress Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, accessible React prototype that demonstrates transparent image-upload and AI-analysis progress, long-wait recovery, cancellation, retry, and manual fallback, then deploy it to GitHub Pages through GitHub Actions.

**Architecture:** A React + TypeScript + Vite single-page application reads and validates images locally, then drives a clearly labeled simulated analysis pipeline through a pure reducer and a timer-coordination hook. UI components render the state but never own scheduling logic; scenario timing is data-driven, stale callbacks are rejected through run IDs, and no backend or API key is used.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, user-event, ESLint, CSS, GitHub Actions, GitHub Pages.

## Global Constraints

- Repository root: `stow-image-progress/`.
- Deployment target: `https://dazkha.github.io/stow-image-progress/`.
- Source target: `https://github.com/DazKha/stow-image-progress`.
- Runtime: Node.js 22 or newer locally; GitHub Actions uses `node-version: lts/*`.
- The site must build as static assets and work from a GitHub Pages repository subpath.
- No backend, API key, model call, analytics service, or persistent storage.
- Actual behavior: local file selection, image decoding, metadata extraction, validation, cancellation, and UI state handling.
- Simulated behavior: upload byte progress and AI processing stages; label this clearly in the UI and README.
- Do not show numeric progress for recognition, dimension estimation, or recommendation preparation.
- Preserve the selected image and draft message through long-wait, retry, and recoverable failure flows.
- Revoke every created object URL when its file is replaced, removed, or the application unmounts.
- Animations must respect `prefers-reduced-motion`.
- Every task follows red-green-refactor: write the failing test, observe failure, add minimum implementation, observe pass, then commit.

---

## Planned file structure

```text
stow-image-progress/
├── .github/
│   └── workflows/
│       └── pages.yml
├── src/
│   ├── components/
│   │   ├── AttachmentCard.tsx
│   │   ├── ImageComposer.tsx
│   │   ├── LongWaitPanel.tsx
│   │   ├── ManualDetailsForm.tsx
│   │   ├── ProgressTimeline.tsx
│   │   ├── ResultCard.tsx
│   │   └── ScenarioSelector.tsx
│   ├── domain/
│   │   ├── analysisMachine.test.ts
│   │   ├── analysisMachine.ts
│   │   ├── analysisTypes.ts
│   │   └── scenarios.ts
│   ├── hooks/
│   │   ├── useAnalysisSimulation.test.tsx
│   │   └── useAnalysisSimulation.ts
│   ├── lib/
│   │   ├── imageValidation.test.ts
│   │   └── imageValidation.ts
│   ├── test/
│   │   ├── fixtures.ts
│   │   └── setup.ts
│   ├── App.integration.test.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── .gitignore
├── .nvmrc
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Stable interfaces shared across tasks

```ts
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
  | "cancelled";

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
```

---

### Task 1: Create the tested Vite application foundation

**Files:**
- Create: `stow-image-progress/package.json`
- Create: `stow-image-progress/package-lock.json`
- Create: `stow-image-progress/index.html`
- Create: `stow-image-progress/vite.config.ts`
- Create: `stow-image-progress/tsconfig.json`
- Create: `stow-image-progress/tsconfig.app.json`
- Create: `stow-image-progress/tsconfig.node.json`
- Create: `stow-image-progress/eslint.config.js`
- Create: `stow-image-progress/.gitignore`
- Create: `stow-image-progress/.nvmrc`
- Create: `stow-image-progress/src/test/setup.ts`
- Create: `stow-image-progress/src/main.tsx`
- Create: `stow-image-progress/src/App.tsx`
- Create: `stow-image-progress/src/App.integration.test.tsx`

**Interfaces:**
- Consumes: None.
- Produces: a runnable React application; scripts `dev`, `build`, `preview`, `lint`, `typecheck`, and `test`; Vitest configured with jsdom and `src/test/setup.ts`.

- [x] **Step 1: Initialize the repository and install the exact dependency set**

Run:

```bash
mkdir stow-image-progress
cd stow-image-progress
git init -b main
npm init -y
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom
```

Update the generated `package.json` scripts to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "engines": {
    "node": ">=22"
  }
}
```

Create `.nvmrc` with:

```text
22
```

- [x] **Step 2: Configure Vite, TypeScript, ESLint, and Vitest**

Use `base: "./"` because the app has no client-side routes and must work under the GitHub Pages repository path. Configure Vitest with `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`, and `restoreMocks: true`.

`src/test/setup.ts` must contain:

```ts
import "@testing-library/jest-dom/vitest";
```

- [x] **Step 3: Write the failing application smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("identifies the page as a simulated image analysis prototype", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /image analysis progress/i })).toBeInTheDocument();
  expect(screen.getByText(/simulated processing/i)).toBeInTheDocument();
});
```

- [x] **Step 4: Run the test and verify red state**

Run:

```bash
npm run test:run -- src/App.integration.test.tsx
```

Expected: FAIL because `App` does not yet render the required heading and disclosure.

- [x] **Step 5: Implement the minimum application shell**

```tsx
export default function App() {
  return (
    <main>
      <h1>Image analysis progress</h1>
      <p>Prototype - simulated processing</p>
    </main>
  );
}
```

- [x] **Step 6: Verify the foundation**

Run:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Expected: all commands exit 0; `dist/index.html` exists and references relative assets.

- [x] **Step 7: Commit the foundation**

```bash
git add .
git commit -m "chore: initialize image progress prototype"
```

---

### Task 2: Implement the pure analysis state machine

**Files:**
- Create: `stow-image-progress/src/domain/analysisTypes.ts`
- Create: `stow-image-progress/src/domain/analysisMachine.ts`
- Create: `stow-image-progress/src/domain/analysisMachine.test.ts`
- Create: `stow-image-progress/src/test/fixtures.ts`

**Interfaces:**
- Consumes: shared types defined in this plan.
- Produces: `initialAnalysisState: AnalysisState`; `analysisReducer(state: AnalysisState, event: AnalysisEvent): AnalysisState`; `fixtureAttachment: AttachmentMeta`; `fixtureResult: DemoResult`.

- [x] **Step 1: Define the domain types and fixture data**

Add the shared interfaces exactly as listed above. Define `AnalysisEvent` as:

```ts
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
  | { type: "OPEN_MANUAL_ENTRY" }
  | { type: "COMPLETE"; runId: number; result: DemoResult };
```

Use this fixture result:

```ts
export const fixtureResult: DemoResult = {
  item: "City bicycle with basket",
  dimensionsM: [1.75, 0.6, 1.05],
  volumeM3: 1.1,
  confidence: "Medium",
};
```

- [x] **Step 2: Write reducer tests before implementation**

Cover these cases with explicit assertions:

```ts
it("starts only when a file is selected");
it("ignores runtime events from a stale run id");
it("keeps the draft when analysis is cancelled");
it("keeps the attachment and resumes at recognition on retry");
it("never completes after cancellation from the same run");
it("clears result and processing state when the file is removed");
it("represents long wait without replacing the active phase");
```

For stale-event behavior, start run `1`, then start run `2`, then dispatch a `COMPLETE` event for run `1`; assert the state is not completed.

- [x] **Step 3: Run reducer tests and verify red state**

Run:

```bash
npm run test:run -- src/domain/analysisMachine.test.ts
```

Expected: FAIL because `analysisReducer` and `initialAnalysisState` do not exist.

- [x] **Step 4: Implement the reducer with a stale-run guard**

At the top of `analysisReducer`, classify runtime events and ignore any runtime event whose `runId` differs from `state.runId`. `SELECT_FILE`, `REMOVE_FILE`, `SET_DRAFT`, `SET_SCENARIO`, `START`, `DISMISS_LONG_WAIT`, and `OPEN_MANUAL_ENTRY` are not rejected by this guard.

`SELECT_FILE`, `REMOVE_FILE`, and `CANCEL` must invalidate callbacks captured by the previous run. Set `runId` to `state.runId + 1` in those transitions. The hook's run counter must always choose a value greater than the current state run ID before dispatching `START` or `RETRY`. In addition, accept `COMPLETE` only when the current phase is `preparing`; this provides defense in depth if a callback is dispatched in the wrong phase.

Important transitions:

```ts
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

case "RETRY":
  if (!state.attachment || !state.error || state.error.stage !== "recognition") return state;
  return {
    ...state,
    phase: "recognizing",
    runId: event.runId,
    elapsedMs: 0,
    longWait: false,
    longWaitDismissed: false,
    error: null,
    retryCount: state.retryCount + 1,
  };
```

- [x] **Step 5: Run reducer tests and the full verification suite**

```bash
npm run test:run -- src/domain/analysisMachine.test.ts
npm run lint
npm run typecheck
```

Expected: all exit 0.

- [x] **Step 6: Commit the state machine**

```bash
git add src/domain src/test/fixtures.ts
git commit -m "feat: add deterministic analysis state machine"
```

---

### Task 3: Validate and decode selected images locally

**Files:**
- Create: `stow-image-progress/src/lib/imageValidation.ts`
- Create: `stow-image-progress/src/lib/imageValidation.test.ts`

**Interfaces:**
- Consumes: browser `File`, `URL.createObjectURL`, and `Image`.
- Produces: `validateImageFile(file: File): Promise<AttachmentMeta>`; `ImageValidationException` carrying an `AnalysisError`; constants `ACCEPTED_IMAGE_TYPES` and `MAX_IMAGE_BYTES`.

- [x] **Step 1: Write failing validation tests**

Test these exact cases:

```ts
it("rejects a zero-byte image as empty_file");
it("rejects a PDF as unsupported_type");
it("rejects an image larger than 10 MiB as too_large");
it("revokes the object URL when image decoding fails");
it("returns filename, dimensions, size, type, id, and preview URL for a valid image");
```

Mock `URL.createObjectURL`, `URL.revokeObjectURL`, and the global `Image` constructor. Use `MAX_IMAGE_BYTES = 10 * 1024 * 1024` and accepted types `image/jpeg`, `image/png`, and `image/webp`.

- [x] **Step 2: Run the tests and verify red state**

```bash
npm run test:run -- src/lib/imageValidation.test.ts
```

Expected: FAIL because the validation module does not exist.

- [x] **Step 3: Implement validation in a fixed order**

Validation order:

1. Reject `file.size === 0`.
2. Reject unaccepted MIME types.
3. Reject files larger than `MAX_IMAGE_BYTES`.
4. Create an object URL.
5. Decode through an `Image` instance.
6. On decode error, revoke the URL and throw `decode_failed`.
7. On success, return metadata and leave ownership of the URL to the caller.

Generate the attachment ID with `crypto.randomUUID()`.

- [x] **Step 4: Verify the validation module**

```bash
npm run test:run -- src/lib/imageValidation.test.ts
npm run lint
npm run typecheck
```

Expected: all exit 0.

- [x] **Step 5: Commit local image validation**

```bash
git add src/lib
git commit -m "feat: validate image attachments locally"
```

---

### Task 4: Build scenario configuration and timer coordination hook

**Files:**
- Create: `stow-image-progress/src/domain/scenarios.ts`
- Create: `stow-image-progress/src/hooks/useAnalysisSimulation.ts`
- Create: `stow-image-progress/src/hooks/useAnalysisSimulation.test.tsx`

**Interfaces:**
- Consumes: `analysisReducer`, `initialAnalysisState`, `ScenarioName`, and `fixtureResult`.
- Produces: `SCENARIOS: Record<ScenarioName, ScenarioConfig>` and `useAnalysisSimulation()` returning `{ state, selectAttachment, removeAttachment, setDraft, setScenario, start, cancel, retry, keepWaiting, openManualEntry }`.

Define configuration as:

```ts
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
```

Use demo timings:

```ts
normal: warningMs null, uploadTickMs 80, uploadStep 20,
        validating 300, recognizing 900, estimating 700, preparing 500
slow:   warningMs 2000, uploadTickMs 100, uploadStep 20,
        validating 400, recognizing 6000, estimating 900, preparing 600
failure: warningMs null, uploadTickMs 80, uploadStep 20,
         validating 300, recognizing 1000, estimating 700, preparing 500,
         failAt recognizing, retrySucceeds true
```

- [x] **Step 1: Write hook tests with fake timers**

Use `vi.useFakeTimers()` and `renderHook`. Test:

```ts
it("completes the normal scenario");
it("shows long-wait controls while the slow scenario remains in recognition");
it("fails at recognition in the failure scenario");
it("retries recognition without returning to uploading");
it("does not complete after cancellation even when all timers run");
it("ignores callbacks from a previous run after the attachment is replaced");
```

- [x] **Step 2: Run hook tests and verify red state**

```bash
npm run test:run -- src/hooks/useAnalysisSimulation.test.tsx
```

Expected: FAIL because the scenario map and hook do not exist.

- [x] **Step 3: Implement scenario data and hook scheduling**

Use refs for scheduled timeout IDs and an incrementing run ID. Centralize cleanup:

```ts
const clearScheduledWork = useCallback(() => {
  timeoutIds.current.forEach(window.clearTimeout);
  intervalIds.current.forEach(window.clearInterval);
  timeoutIds.current = [];
  intervalIds.current = [];
}, []);
```

Call cleanup before start, retry, cancel, removal, replacement, and unmount. Every scheduled reducer event must include the captured run ID. In the failure scenario, retry bypasses `failAt` after `retryCount` becomes `1`.

- [x] **Step 4: Verify hook timing and stale-callback protection**

```bash
npm run test:run -- src/hooks/useAnalysisSimulation.test.tsx
npm run test:run -- src/domain/analysisMachine.test.ts
npm run lint
npm run typecheck
```

Expected: all exit 0.

- [x] **Step 5: Commit the simulation engine**

```bash
git add src/domain/scenarios.ts src/hooks
git commit -m "feat: simulate normal slow and failure analysis flows"
```

---

### Task 5: Build image selection and attachment UI

**Files:**
- Create: `stow-image-progress/src/components/ImageComposer.tsx`
- Create: `stow-image-progress/src/components/AttachmentCard.tsx`
- Create: `stow-image-progress/src/components/ScenarioSelector.tsx`
- Modify: `stow-image-progress/src/App.integration.test.tsx`
- Modify: `stow-image-progress/src/App.tsx`

**Interfaces:**
- Consumes: `validateImageFile`, `AnalysisState`, and commands from `useAnalysisSimulation`.
- Produces: accessible file selection, drag-and-drop, attachment metadata, message draft, scenario selection, analyze action, removal, and object URL cleanup.

- [x] **Step 1: Write failing user-flow tests**

Add tests that verify:

```ts
it("selects an image and shows its filename, size, and dimensions");
it("keeps the message draft when analysis starts");
it("disables analyze until a valid image is selected");
it("shows a specific validation error for an unsupported file");
it("revokes the previous preview URL when the attachment is replaced");
it("allows Normal, Slow, and Failure scenarios to be selected");
```

Mock only `validateImageFile`; do not duplicate its decoding behavior in component tests.

- [x] **Step 2: Run the focused tests and verify red state**

```bash
npm run test:run -- src/App.integration.test.tsx
```

Expected: FAIL because the interactive components do not exist.

- [x] **Step 3: Implement the composer components**

`ImageComposer` must expose a labeled file input accepting `.jpg,.jpeg,.png,.webp`, a visible drop zone, a controlled textarea, and an `Analyze image` button. `AttachmentCard` owns presentation only. `App` owns object URL revocation through a ref that tracks the current preview URL.

The disclosure must remain visible:

> This prototype validates your file locally. The AI processing stages and final recognition result are simulated for UX evaluation.

- [x] **Step 4: Verify component behavior**

```bash
npm run test:run -- src/App.integration.test.tsx
npm run lint
npm run typecheck
```

Expected: all exit 0.

- [x] **Step 5: Commit the selection flow**

```bash
git add src/components src/App.tsx src/App.integration.test.tsx
git commit -m "feat: add accessible image selection flow"
```

---

### Task 6: Render progress, long-wait recovery, and cancellation

**Files:**
- Create: `stow-image-progress/src/components/ProgressTimeline.tsx`
- Create: `stow-image-progress/src/components/LongWaitPanel.tsx`
- Modify: `stow-image-progress/src/App.integration.test.tsx`
- Modify: `stow-image-progress/src/App.tsx`

**Interfaces:**
- Consumes: active phase, upload progress, elapsed milliseconds, long-wait flags, and hook commands.
- Produces: stage timeline, measured upload progress, elapsed time, long-wait announcement, `Keep waiting`, `Retry analysis`, `Cancel`, and `Enter details manually` actions.

- [x] **Step 1: Write failing progress and recovery tests**

Use fake timers and verify:

```ts
it("shows numeric progress only while uploading");
it("shows elapsed time and named stages during analysis");
it("announces the long-wait message through a polite live region");
it("keeps the active recognition stage visible during long wait");
it("keeps the image and draft after retry");
it("shows Cancelled and never renders the result after cancel");
```

- [x] **Step 2: Run focused tests and verify red state**

```bash
npm run test:run -- src/App.integration.test.tsx
```

Expected: FAIL because progress and long-wait components do not exist.

- [x] **Step 3: Implement timeline and long-wait controls**

`ProgressTimeline` derives each row as `complete`, `active`, or `pending` from the ordered stage list. Render `role="progressbar"` only for upload and provide `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`. For later stages, render status text and elapsed time without a percentage.

`LongWaitPanel` must render this copy:

> This is taking longer than usual. Your image and message are still safe.

Focus its heading once when it first appears by using a ref and an effect keyed to the transition from hidden to visible.

- [x] **Step 4: Verify recovery behavior**

```bash
npm run test:run -- src/App.integration.test.tsx
npm run test:run -- src/hooks/useAnalysisSimulation.test.tsx
npm run lint
npm run typecheck
```

Expected: all exit 0.

- [x] **Step 5: Commit progress and recovery UI**

```bash
git add src/components/ProgressTimeline.tsx src/components/LongWaitPanel.tsx src/App.tsx src/App.integration.test.tsx
git commit -m "feat: explain long image analysis waits"
```

---

### Task 7: Add failure recovery, manual fallback, and demo result

**Files:**
- Create: `stow-image-progress/src/components/ManualDetailsForm.tsx`
- Create: `stow-image-progress/src/components/ResultCard.tsx`
- Modify: `stow-image-progress/src/App.integration.test.tsx`
- Modify: `stow-image-progress/src/App.tsx`

**Interfaces:**
- Consumes: `AnalysisError`, `DemoResult`, `manualEntryOpen`, retry and manual-entry commands.
- Produces: stage-specific error UI, retry without re-upload, manual item-details fallback, fixture result, and clarification questions.

- [x] **Step 1: Write failing failure-and-result tests**

```ts
it("explains that upload succeeded when recognition fails");
it("retries recognition without showing upload progress again");
it("opens manual entry with item name and optional dimensions");
it("marks the completed result as simulated");
it("asks whether the bicycle stays intact and can be stacked above");
```

- [x] **Step 2: Run focused tests and verify red state**

```bash
npm run test:run -- src/App.integration.test.tsx
```

Expected: FAIL because result and fallback components do not exist.

- [x] **Step 3: Implement failure, fallback, and result components**

Recognition error copy:

> Your image was received, but item recognition could not be completed.

The manual form fields are:

- `Item name` required.
- `Length`, `Width`, and `Height` optional numeric inputs in meters.

The result card must show the exact `fixtureResult`, the label `Simulated demo output`, and two yes/no clarification controls. It must not calculate or recommend a storage plan.

- [x] **Step 4: Verify complete recovery paths**

```bash
npm run test:run -- src/App.integration.test.tsx
npm run test:run
npm run lint
npm run typecheck
```

Expected: all exit 0.

- [x] **Step 5: Commit failure and completion flows**

```bash
git add src/components/ManualDetailsForm.tsx src/components/ResultCard.tsx src/App.tsx src/App.integration.test.tsx
git commit -m "feat: add retry fallback and demo result"
```

---

### Task 8: Apply responsive visual design and accessibility safeguards

**Files:**
- Create: `stow-image-progress/src/styles.css`
- Modify: `stow-image-progress/src/main.tsx`
- Modify: `stow-image-progress/src/App.tsx`
- Modify: `stow-image-progress/src/App.integration.test.tsx`

**Interfaces:**
- Consumes: semantic markup from all UI components.
- Produces: responsive desktop/mobile layout, visible focus, non-color status indicators, reduced-motion handling, and an application-ready screenshot surface.

- [x] **Step 1: Add failing accessibility assertions**

Assert that:

```ts
expect(screen.getByLabelText(/choose an image/i)).toHaveAttribute("accept", expect.stringContaining("image/png"));
expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
expect(screen.getByRole("button", { name: /remove selected image/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /cancel image analysis/i })).toBeInTheDocument();
```

- [x] **Step 2: Run focused tests and verify red state**

```bash
npm run test:run -- src/App.integration.test.tsx
```

Expected: FAIL on missing accessible names or live-region attributes.

- [x] **Step 3: Add the required semantics and visual system**

Use CSS custom properties for navy text, blue action color, neutral surfaces, warning amber, danger red, radii, and spacing. Keep content width near 760px, make action groups wrap below 640px, and keep touch targets at least 44px high. Use icons or text labels in addition to color for stage state.

Add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [x] **Step 4: Verify tests and production build**

```bash
npm run test:run
npm run lint
npm run typecheck
npm run build
```

Expected: all exit 0.

- [x] **Step 5: Commit visual and accessibility work**

```bash
git add src
git commit -m "feat: polish responsive and accessible interface"
```

---

### Task 9: Add CI, GitHub Pages deployment, and reviewer documentation

**Files:**
- Create: `stow-image-progress/.github/workflows/pages.yml`
- Create: `stow-image-progress/README.md`

**Interfaces:**
- Consumes: package scripts and `dist/` production output.
- Produces: verified pull requests, automatic main-branch Pages deployment, and complete local/reviewer instructions.

- [x] **Step 1: Write the GitHub Actions workflow**

Use two jobs. `build` runs for pull requests, main pushes, and manual dispatch. It checks out code, installs Node LTS, runs `npm ci`, lint, typecheck, tests, and build. It uploads `dist` as a Pages artifact only outside pull requests. `deploy` runs only outside pull requests and depends on `build`.

Use the current official major action versions:

```yaml
name: Verify and deploy

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:run
      - run: npm run build
      - if: github.event_name != 'pull_request'
        uses: actions/configure-pages@v6
      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [x] **Step 2: Write README with exact reviewer instructions**

README sections:

1. `Problem observed` - nearly two-minute wait with only `Analyzing...`.
2. `Prototype decision` - why this scope was selected over a generalized QA harness.
3. `What is real and simulated` - local validation is real; AI pipeline and result are simulated.
4. `Try the three scenarios` - exact expected behavior for Normal, Slow, and Failure.
5. `Run locally` with:

```bash
npm ci
npm run dev
```

6. `Verify` with:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

7. `Architecture` - reducer, hook, components, scenario data, stale run protection.
8. `Known limitations` - no model call, no real network upload, fixture output.
9. `With internal access` - validate real stages and latency percentiles, then build a business-grounded QA harness.
10. `Live demo` - `https://dazkha.github.io/stow-image-progress/`.

- [x] **Step 3: Run the exact CI command sequence locally**

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Expected: all exit 0 and `dist/index.html` exists.

- [x] **Step 4: Commit workflow and documentation**

```bash
git add .github/workflows/pages.yml README.md package-lock.json
git commit -m "ci: verify and deploy prototype to GitHub Pages"
```

---

### Task 10: Perform final regression and deployment-readiness review

**Files:**
- Modify only files required to correct failures found during this task.

**Interfaces:**
- Consumes: the complete prototype.
- Produces: a locally verified commit ready for the user to push to `DazKha/stow-image-progress` and enable GitHub Pages with `Source: GitHub Actions`.

- [x] **Step 1: Run the complete automated verification from a clean install**

```bash
rm -rf node_modules dist
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Expected: all commands exit 0.

- [x] **Step 2: Serve the production build**

```bash
npm run preview -- --host 127.0.0.1
```

Open the preview URL and verify that all assets load with `base: "./"`.

- [x] **Step 3: Manually verify the acceptance matrix**

At desktop and 390px mobile width, verify:

| Scenario | Required result |
|---|---|
| Normal | Completes without long-wait warning |
| Slow | Shows active recognition stage, elapsed time, and four recovery actions |
| Slow + keep waiting | Dismisses expanded warning and eventually completes |
| Slow + cancel | Shows cancelled state and never completes afterward |
| Failure | Explains that upload succeeded and recognition failed |
| Failure + retry | Restarts at recognition and completes without upload stage |
| Manual fallback | Keeps attachment context and accepts item details |
| Replace image | Revokes prior preview and ignores prior timers |

- [x] **Step 4: Inspect browser accessibility behavior**

Verify keyboard-only operation, visible focus, live status announcements, focus placement on long-wait/error headings, and reduced-motion behavior.

- [x] **Step 5: Capture one application-report screenshot**

Capture the Slow scenario with the current recognition stage, completed prior stages, elapsed time, long-wait explanation, and recovery actions visible. Do not include browser extensions, personal data, or local filesystem paths.

- [x] **Step 6: Review the GitHub diff and commit corrections**

```bash
git status --short
git diff --check
git diff --stat
git add -A
git commit -m "test: complete prototype release verification"
```

If the final review produced no changes, do not create an empty commit; record the passing verification output in the handoff instead.

- [x] **Step 7: User deployment handoff**

The user creates or selects the public GitHub repository `DazKha/stow-image-progress`, pushes the `main` branch, then chooses `Settings -> Pages -> Build and deployment -> Source: GitHub Actions`. Confirm that the workflow succeeds and that `https://dazkha.github.io/stow-image-progress/` loads before adding the URL to the application PDF.

---

## Definition of done

- All automated tests pass from a clean `npm ci` install.
- Lint, type checking, and production build exit 0.
- Normal, Slow, and Failure scenarios meet the manual acceptance matrix.
- No stale callback can complete a cancelled or replaced run.
- Local validation and simulated processing are clearly distinguished.
- GitHub Actions verifies pull requests and deploys main-branch builds to Pages.
- README gives complete local run, test, architecture, limitation, and reviewer instructions.
- The deployed URL and source URL are ready to place in the final application PDF.
