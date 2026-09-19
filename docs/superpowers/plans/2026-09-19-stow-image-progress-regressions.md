# STOW Interaction Prototype Regression Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix retry, processing guards, timer cleanup, manual fallback, documentation URLs, and Node compatibility while preserving the static simulated GitHub Pages prototype.

**Architecture:** Keep `analysisReducer` as the pure state-transition authority and `useAnalysisSimulation` as the owner of scheduled work. Add explicit `manual_entry` state and a derived processing predicate, invalidate runs before restarting or entering fallback, and make stale event guards reject callbacks from old runs. Cover hook/reducer behavior with fake-timer tests and UI behavior with integration tests.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, GitHub Actions, GitHub Pages.

## Global Constraints

- Keep all processing simulated; do not add a backend, real AI, upload service, pricing, auth, or analytics.
- Preserve attachment and draft data across Retry and Manual fallback.
- Keep existing visual design and keyboard-accessible disabled semantics.
- Set Node engine to `^22.12.0 || ^24.0.0 || >=26.0.0` and prefer Node 24.
- Correct README links to `https://dazkha.github.io/STOW-INTERACTION-PROTOTYPE/` and `https://github.com/DazKha/STOW-INTERACTION-PROTOTYPE`.

### Task 1: Add reducer and hook regression tests for stale-run and terminal behavior

**Files:**
- Modify: `src/domain/analysisMachine.test.ts`
- Modify: `src/hooks/useAnalysisSimulation.test.tsx`

**Interfaces:**
- Consumes: current reducer events and `useAnalysisSimulation` public actions.
- Produces: failing tests that demonstrate long-wait retry, manual fallback cancellation, and elapsed timer terminal invariants.

- [x] Write a reducer test proving `RETRY` is accepted from `recognizing + longWait` and preserves attachment, draft, and upload completion.
- [x] Write hook tests proving long-wait retry increments the run, restarts recognition without upload, and completes after the new recognition duration.
- [x] Write hook tests proving elapsed time does not change after completion and failure, even after advancing fake timers.
- [x] Write a hook test proving opening manual fallback prevents later completion.
- [x] Run the focused tests and confirm each new regression test fails for the current implementation.

### Task 2: Implement explicit processing/manual state transitions

**Files:**
- Modify: `src/domain/analysisTypes.ts`
- Modify: `src/domain/analysisMachine.ts`
- Modify: `src/hooks/useAnalysisSimulation.ts`

**Interfaces:**
- Consumes: the failing reducer and hook tests from Task 1.
- Produces: `manual_entry` phase, `isProcessing` derivation, run invalidation, retry from long wait or recognition error, and cleanup-safe scheduling.

- [x] Add `manual_entry` to `AnalysisPhase` and keep runtime events guarded by the active run ID.
- [x] Update `RETRY` to allow either recoverable recognition error or active long-wait recognition, preserve `uploadProgress` at 100, reset elapsed/long-wait flags, increment retry count, and keep attachment/draft.
- [x] Make `OPEN_MANUAL_ENTRY` invalidate the active run and enter `manual_entry` while preserving attachment/draft.
- [x] Refactor scheduled work bookkeeping so timeout and interval callbacks are removed/cleared on terminal transitions without clearing the currently executing callback before it dispatches its transition.
- [x] Stop elapsed updates for completed, error, cancelled, and manual-entry states; stale callbacks must be ignored by run ID.
- [x] Run focused reducer/hook tests and confirm they pass.

### Task 3: Add UI processing guards and functional manual submission

**Files:**
- Modify: `src/components/ImageComposer.tsx`
- Modify: `src/components/ScenarioSelector.tsx`
- Modify: `src/components/ManualDetailsForm.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `AnalysisPhase`/`manual_entry` and simulation actions from Task 2.
- Produces: disabled Analyze/scenario/file replacement during all processing phases, functional manual form submission, and confirmation copy.

- [x] Add integration tests for `uploading`, `validating`, `recognizing`, `estimating`, and `preparing` proving Analyze and scenario controls are disabled.
- [x] Add integration tests proving manual entry cancels the simulation, rejects blank item names, accepts a valid name, and displays “Details saved for manual sizing.” without a result card.
- [x] Pass a single `isProcessing` value into the composer and scenario selector; disable the Analyze button, selector, file input, drop handling, and remove action while processing, while leaving explicit recovery actions active.
- [x] Make `ManualDetailsForm` a controlled submit-capable form with required non-empty item-name validation and an `onSubmit` callback.
- [x] Render manual entry from the explicit `manual_entry` phase, keep the attachment/draft visible, and show confirmation after valid submission.
- [x] Run focused integration tests and confirm they pass.

### Task 4: Apply runtime/documentation compatibility changes

**Files:**
- Modify: `package.json`
- Modify: `.nvmrc`
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: current project scripts and deployment workflow.
- Produces: compatible local/CI Node selection and corrected repository/demo/deployment documentation.

- [x] Set the exact Node engine range in `package.json` and `.nvmrc` to `24`.
- [x] Configure GitHub Actions to use Node 24 explicitly while retaining npm cache and existing verification/deploy behavior.
- [x] Replace every obsolete URL/repository name in README, including clone/deployment instructions, while preserving simulated-processing disclosure.
- [x] Search for old URLs and confirm no occurrences remain.

### Task 5: Full verification and manual QA evidence

**Files:**
- No additional source files unless verification identifies a failing requirement.

**Interfaces:**
- Consumes: all fixes and tests from Tasks 1–4.
- Produces: clean-state verification evidence and manual-test/deployment evidence.

- [x] Run `rm -rf node_modules dist` only within this repository, then `npm ci`.
- [x] Run `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, `git diff --check`, and `git status --short`.
- [ ] Run the required manual matrix with an actual image, including desktop and 390px mobile overflow checks; browser upload is blocked by the connector's file chooser permission.
- [ ] Commit focused changes with descriptive messages only after all checks pass.
- [ ] Push `main`, monitor GitHub Actions until deployment succeeds, verify production HTTP 200, and verify both corrected README URLs return HTTP 200.
