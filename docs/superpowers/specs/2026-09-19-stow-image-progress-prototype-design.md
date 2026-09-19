# STOW Image Analysis Progress Prototype - Design Specification

## 1. Purpose

Build a small, deployable prototype that addresses one directly observed STOW usability problem: image analysis can take a long time while the interface exposes only a single `Analyzing...` status. During the wait, the user cannot tell whether the image uploaded successfully, which processing step is active, whether the request is stuck, or what recovery actions are available.

The prototype will demonstrate a clearer long-running image-analysis experience. It will be a static React application deployed to GitHub Pages through GitHub Actions. It will not claim to reproduce MyStorage's private backend or perform real AI image recognition.

## 2. Product rationale

An AI conversation QA harness was considered first. It could eventually provide broader regression coverage across pricing, sizing, localization, privacy, and latency. However, an external candidate does not have MyStorage's internal business rules, expected agent behavior, production transcripts, labeled outcomes, or service contracts. Generalizing from a few black-box conversations would risk encoding assumptions as requirements.

The selected problem is narrower but better supported by evidence. The slow image-analysis wait was directly observed, its user impact is clear, and its interaction states can be prototyped without inventing business policy.

## 3. Goals

- Make upload and analysis progress understandable without displaying fake percentages for non-deterministic AI work.
- Confirm that the file has been received and preserve the user's draft message throughout processing.
- Give useful feedback during unusually long processing.
- Let the user cancel, retry the failed stage, or fall back to manual item details.
- Demonstrate normal, slow, and failure behavior without requiring a real two-minute wait.
- Make the implementation deterministic, accessible, testable, and deployable as a static site.

## 4. Non-goals

- Real object recognition, dimension estimation, or plan pricing.
- Reproducing STOW's production APIs or internal pipeline.
- Uploading the selected image to any third-party service.
- Implementing a generalized conversation evaluation framework.
- Copying the production UI pixel-for-pixel.
- Persisting images or user data after a page refresh.

## 5. Deployment constraint and architecture decision

The demo will be deployed to GitHub Pages using GitHub Actions. GitHub Pages serves static assets and does not provide a persistent application backend. Therefore:

- The selected image is read locally with browser APIs.
- File type, file size, and image readability are validated locally.
- The thumbnail is created from an object URL and revoked when replaced or removed.
- Server-side analysis stages are represented by a clearly labeled simulation engine.
- Scenario timings are deterministic and configurable for automated tests.
- No API keys or secrets are required.

This is preferable to presenting a fake network service as a working backend. The prototype's purpose is to validate the interaction design and state handling.

## 6. User experience

### 6.1 Initial state

The page contains:

- A short problem statement and `Prototype - simulated processing` disclosure.
- A chat-style message composer.
- An image picker with drag-and-drop support.
- A scenario selector: `Normal`, `Slow`, or `Failure`.
- A primary `Analyze image` action.

The interface should be visually compatible with a modern chat product but remain an original implementation.

### 6.2 File selected

After a valid image is selected, the attachment card shows:

- Thumbnail.
- Filename.
- File size.
- Image dimensions when available.
- Remove action.
- `Ready to analyze` status.

The draft message remains editable.

### 6.3 Processing stages

The prototype uses the following ordered stages:

1. `Uploading image`
2. `Checking image quality`
3. `Recognizing the item`
4. `Estimating dimensions`
5. `Preparing recommendation`
6. `Complete`

Only the upload stage displays a numeric percentage because byte progress is measurable. AI-like stages display a spinner, elapsed time, completed steps, and the current step. They do not display invented completion percentages.

### 6.4 Long-wait behavior

In the `Slow` scenario:

- At the configured warning threshold, show: `This is taking longer than usual. Your image and message are still safe.`
- Expose `Keep waiting`, `Retry analysis`, `Cancel`, and `Enter details manually` actions.
- Preserve the thumbnail and draft message for every action.
- `Retry analysis` restarts from `Recognizing the item`; it does not repeat local file selection or upload.
- `Keep waiting` dismisses the expanded warning while retaining a compact long-wait indicator.

The production recommendation is to trigger the first warning around 10-15 seconds and stronger recovery options around 30 seconds. The demo may use shorter timings so reviewers can see the behavior quickly, with the real thresholds documented alongside it.

### 6.5 Failure behavior

The `Failure` scenario fails during `Recognizing the item` and displays:

> Your image was received, but item recognition could not be completed.

Actions:

- `Retry analysis` restarts at recognition.
- `Enter details manually` opens a compact form for item name and optional dimensions.
- `Choose another image` returns to file selection.

The error must identify the failed step and must not imply that the upload failed.

### 6.6 Completion behavior

Completion displays a transparent fixture result, for example:

- Detected item: `City bicycle with basket`
- Estimated dimensions: `1.75 x 0.60 x 1.05 m`
- Estimated base volume: `1.10 m3`
- Confidence: `Medium`

The UI explicitly marks this as demo output. It then asks the two clarification questions that were missing from the original image flow:

- Will the bicycle be stored intact?
- Can other items be stacked above it?

The prototype stops before pricing or plan selection to avoid inventing internal storage rules.

## 7. State model

### 7.1 Core states

```text
idle
  -> selected
  -> uploading
  -> validating
  -> recognizing
  -> estimating
  -> preparing
  -> completed
```

### 7.2 Exceptional states

Any active processing state can transition to:

```text
long_wait
error
cancelled
```

`long_wait` is represented as an overlay condition on top of the active stage rather than replacing the active stage. This ensures that the UI can still report what work is ongoing.

### 7.3 State transition rules

- Starting analysis requires a valid selected image.
- Cancel invalidates all scheduled transitions.
- Removing or replacing a file invalidates the current run.
- A run identifier prevents callbacks from an older run from mutating current state.
- Retry after an analysis failure resumes from recognition.
- Retry after a local validation failure requires a new file.
- Completion cannot occur after cancellation, removal, replacement, or a newer run.
- The user's message draft is independent from the processing state.

## 8. Component boundaries

### `PrototypeShell`

Owns page layout, disclosure, scenario controls, and high-level composition.

### `ImageComposer`

Owns the message draft, file input, drag-and-drop behavior, and analyze action. It does not own pipeline timing.

### `AttachmentCard`

Renders file metadata, thumbnail, validation feedback, and remove action.

### `ProgressTimeline`

Renders completed, active, and pending stages. It receives state and does not schedule transitions.

### `LongWaitPanel`

Renders long-wait explanation and recovery actions. It is announced through an accessible live region.

### `ResultCard`

Renders fixture output and clarification questions. It labels the result as simulated.

### `ManualDetailsForm`

Provides the fallback path for item name and optional dimensions.

### `useAnalysisSimulation`

Coordinates the state machine, timers, run identifiers, cancellation, retry, elapsed time, and scenario definitions. UI components communicate with it through explicit commands and derived state.

### `analysisMachine`

A pure TypeScript reducer containing legal transitions. It has no timers or browser dependencies and is unit-testable.

## 9. Scenario definitions

Scenario timing is stored as data rather than embedded in UI components.

### Normal

- Short upload and validation.
- All analysis stages complete.
- No long-wait warning.

### Slow

- Upload and validation complete normally.
- Recognition exceeds the demo warning threshold.
- User can keep waiting, retry, cancel, or use manual entry.
- If the user keeps waiting, processing eventually completes.

### Failure

- Upload and validation complete normally.
- Recognition returns a typed error.
- Retry can be configured to succeed so the reviewer can verify recovery.

## 10. Accessibility requirements

- All functionality is keyboard accessible.
- File input has a visible label and accepted formats.
- Status changes use `aria-live="polite"`.
- Errors use an assertive announcement only when immediate attention is required.
- Focus moves to the long-wait or error heading when the corresponding panel first appears.
- Progress is not communicated by color alone.
- Cancel, retry, remove, and manual-entry buttons have unambiguous accessible names.
- Animations respect `prefers-reduced-motion`.

## 11. Error handling

Local validation errors include:

- Unsupported file type.
- File larger than the documented limit.
- Image cannot be decoded.
- Zero-byte file.

Simulation errors include:

- Recognition timeout.
- Recognition failure.
- Cancelled by user.

Every error message identifies what happened, preserves recoverable input, and presents an appropriate next action.

## 12. Testing strategy

### Unit tests

- Every legal state transition.
- Illegal or stale transitions are ignored.
- Cancel prevents later completion.
- Replacing the file invalidates the previous run.
- Retry after analysis failure resumes at recognition.
- Draft message remains unchanged across retry and cancel.

### Component tests

- Valid and invalid attachment rendering.
- Long-wait actions are shown only after the threshold.
- Failure message names the recognition stage.
- Manual fallback preserves selected-file context.
- Status announcements and accessible labels are present.

### Integration tests

- Normal scenario reaches completion.
- Slow scenario exposes recovery actions and can still complete.
- Failure scenario retries without selecting the file again.
- Cancelled scenario never reaches completion after timers advance.

### Build verification

- Type checking.
- Unit and component tests.
- Production build with the GitHub Pages base path.
- Static bundle loads correctly from a subdirectory.

## 13. GitHub Actions and Pages deployment

The workflow will run on pushes to the default branch and on pull requests.

Pull requests:

1. Install dependencies with a frozen lockfile.
2. Run formatting/lint checks.
3. Run type checking.
4. Run automated tests.
5. Build the static site.

Default-branch pushes:

1. Run the same verification pipeline.
2. Upload the built `dist` directory as a Pages artifact.
3. Deploy through the official GitHub Pages deployment action.

The Vite base path will be configured so the bundle works under a repository subpath. No repository secret is required beyond the standard GitHub Pages token permissions.

## 14. Repository deliverables

- React + TypeScript + Vite application.
- Pure state machine and scenario configuration.
- Automated tests.
- GitHub Actions verification and Pages deployment workflow.
- README containing:
  - Problem statement.
  - What is real versus simulated.
  - Architecture and state model.
  - Local run and test commands.
  - Deployment instructions.
  - Known limitations.
- One screenshot or short GIF suitable for the application PDF.

## 15. Acceptance criteria

- A reviewer can select an image and complete the normal scenario without an API key.
- A reviewer can trigger and understand the slow and failure scenarios.
- The current processing stage and elapsed time are always visible during analysis.
- Long waits expose useful recovery actions without losing the image or draft message.
- Retry after an analysis failure does not require a new file.
- Cancellation prevents stale timers from completing the run.
- The demo clearly distinguishes actual local validation from simulated AI processing.
- Automated tests cover the main state transitions and recovery paths.
- The production build deploys successfully to GitHub Pages through GitHub Actions.

## 16. Application-report framing

The final PDF should explain that the broader QA harness was considered but deferred because its business rules and labels are internal. The selected prototype addresses the most directly observed and reproducible problem. With additional time and internal access, the next step would be to validate the progress stages against the real backend, instrument actual latency percentiles, and then build a conversation QA harness grounded in production policies and labeled cases.
