#!/usr/bin/env bash
set -e
echo "[SmokeTest] Starting weekly staging Playwright smoke test against https://zylobridge.com..."
npx playwright test e2e/auth.spec.ts --project=chromium
echo "[SmokeTest] Staging smoke test completed successfully."
