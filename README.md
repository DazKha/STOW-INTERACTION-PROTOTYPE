# STOW Image Analysis Progress Prototype

## Problem observed

The observed image flow could spend nearly two minutes showing only `Analyzing...`. During that wait, the user could not tell whether the image uploaded, which step was active, or how to recover.

## Prototype decision

This prototype focuses on transparent image-upload and analysis progress rather than a generalized conversation QA harness. The progress problem is directly observed and can be evaluated without inventing MyStorage's private business rules, labels, or service contracts.

## What is real and simulated

- Real: local image selection, drag-and-drop, file type and size validation, image decoding, dimensions, metadata, object URL cleanup, draft preservation, cancellation, and state transitions.
- Simulated: upload byte progress, analysis stages, recognition failure, elapsed processing, and the final fixture result.
- No backend, API key, model call, analytics service, or persistent storage is used.

## Try the three scenarios

- **Normal:** upload and all analysis stages complete without a long-wait warning.
- **Slow:** recognition remains active long enough to show the warning and four recovery actions. Keep waiting eventually completes; retry resumes recognition without uploading again; cancel prevents completion; manual entry preserves context.
- **Failure:** recognition fails after the image is received. Retry resumes at recognition and succeeds; manual entry opens item details; choosing another image returns to selection.

The production recommendation is to warn around 10-15 seconds and provide stronger recovery around 30 seconds. This demo uses shorter timings so reviewers can see the behavior quickly.

## Run locally

```bash
npm ci
npm run dev
```

## Verify

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Architecture

- `analysisMachine` is a pure, browser-independent reducer containing legal transitions and stale run-ID guards.
- `useAnalysisSimulation` owns scheduling, cleanup, elapsed time, retry, and scenario timing. Components do not schedule work.
- `scenarios.ts` stores all demo timings and failure behavior as data.
- `imageValidation.ts` performs local validation and decoding, and returns attachment metadata with an owned preview URL.
- UI components render the composer, attachment, timeline, recovery panel, manual fallback, and simulated result.

## Known limitations

- There is no real network upload or model inference.
- The recognition result is a fixed bicycle fixture and is not evidence of actual recognition quality.
- No user data or image survives a refresh.
- The demo stops before pricing or storage-plan recommendations.

## With internal access

Validate the displayed stages against the real backend, measure actual latency percentiles, and then build a business-grounded conversation QA harness using production policies and labeled cases.

## Live demo

https://dazkha.github.io/STOW-INTERACTION-PROTOTYPE/

## GitHub Pages deployment

The workflow verifies pull requests and pushes to `main`. Only non-PR runs upload the `dist` Pages artifact and deploy it. The Vite bundle uses relative assets so it works at the repository subpath.

1. Use the public repository [`DazKha/STOW-INTERACTION-PROTOTYPE`](https://github.com/DazKha/STOW-INTERACTION-PROTOTYPE) without adding an unrelated initial commit.
2. Add the repository as the `origin` remote in this directory.
3. Push `main`.
4. In repository settings, open `Pages`, choose `GitHub Actions` under Build and deployment, and save.
5. Wait for the `Verify and deploy` workflow to finish, then open https://dazkha.github.io/STOW-INTERACTION-PROTOTYPE/.
