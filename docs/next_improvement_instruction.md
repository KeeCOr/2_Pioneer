# Pioneer Next Improvement Instruction

## Scope
- Project: `C:\Development\2_Pioneer`
- Task class: follow-up improvement planning
- Build: do not build until the next implementation batch is complete.

## Next Tasks

### 1. Route Risk / Profit Summary
- Add a compact route summary before departure that compares expected profit, travel time, risk level, and likely threat sources for the selected trade route.
- Surface the same summary near any route confirmation CTA so the player can decide without jumping between map, cargo, and market panels.
- Validation: create or update at least 3 logic tests covering profitable low-risk, profitable high-risk, and unprofitable/blocked routes.

### 2. Fleet / Trade Screen Flow
- Review the fleet management and trade screens as one continuous flow: select fleet, inspect cargo capacity, choose market goods, confirm route, then depart.
- Reduce duplicated decision points and make back/confirm states explicit so players do not lose the selected fleet, cargo, or route when moving between screens.
- Validation: manually verify loading, empty fleet/cargo, error/retry, 100+ goods or routes, and long Korean item names without layout breakage.

### 3. Release Artifact Consistency
- Audit root, `release/`, `dist/`, and any configured Drive copy path for duplicate or stale Pioneer portable executables.
- Keep exactly one current portable executable name in the expected format and document any intentionally retained helper/runtime files.
- Validation: report artifact path, version, timestamp, size, stale-file cleanup result, and Drive copy status after the next release build.

## Completed 2026-06-29 v1.5.0

- Completed Route Risk / Profit Summary.
- Added route summary near the route confirmation CTA.
- Added three route-summary logic tests.
- Verified with npm test and npm run build.

## Remaining Follow-up

- Completed Fleet / Trade Screen Flow in v1.6.0.
- Release Artifact Consistency remains for the next release build batch.


## Completed 2026-06-29 v1.6.0

- Completed Fleet / Trade Screen Flow.
- Added selected-ship flow strip and three fleetTradeFlow tests.
- Verified npm test and npm run build.
- Release artifact audit completed; portable packaging blocker resolved by recreating C:/temp/pioneer-electron HTTP-server Electron wrapper.
## Completed 2026-06-30 v1.6.0 Release Artifact Consistency

- Recreated the missing `C:/temp/pioneer-electron` Electron wrapper with an internal `127.0.0.1` static server for the Vite build.
- Built `release/Pioneer_v1.6.0_portable.exe` and copied it to the project root.
- Removed stale local `Pioneer_v1.4.1_portable.exe` artifacts and release helper output.
- Synced the latest executable and planning documents to Google Drive.
## Completed 2026-07-03 Metadata And Persona Recheck

- Rewrote persona feedback into readable UTF-8 text.
- Cleaned `package.json` description so project metadata no longer exposes mojibake.
- Confirmed the route-summary and fleet-trade-flow improvements are already implemented; remaining risk is visual density QA with long Korean labels.

## Completed 2026-07-03 Portable Refresh

- Rebuilt the Electron portable after syncing the latest Vite `dist/` into `C:/temp/pioneer-electron`.
- Verification: `npm test` 25/25, `npm run build`, wrapper `npm run dist` with local HTTP server check.
- Copied `Pioneer_v1.6.0_portable.exe` to project root, `release/`, and Google Drive.
