# CI verification (reminders_frontend)

This file documents the commands used to reproduce the frontend pipeline checks locally in CI-like mode and their current status.

## Commands (pipeline-equivalent)

From `reminders_frontend/`:

```bash
npm ci
npm run lint
CI=true npm test -- --watchAll=false
npm run build
```

## Status

- `npm run lint`: PASS
- `CI=true npm test -- --watchAll=false`: PASS
- `npm run build`: PASS

## Notes

- The previously reported build failure from `css-loader` (`Cannot find module './runtime/api'`) does **not** reproduce in the current environment when installing via `npm ci` and running `npm run build`.
- Build output may warn that `caniuse-lite` is out of date (Browserslist warning). This is not a build failure and does not affect the compiled output.
