# Phase 74 Authentication Incident

Date: 2026-08-26

## Live evidence

A passive request to `https://api.zylobridge.com/api/health` returned HTTP 502 with Railway headers `x-railway-fallback: true` and the body `{"status":"error","code":502,"message":"Application failed to respond"}`. The same 502 response occurred for the Google OAuth initiation URL, before any redirect to Google. An invalid email OTP payload was prepared but not completed because Railway was already unavailable; no email was sent.

The authenticated Railway dashboard showed the Zylobridge project with `1/1 service crashed`. This indicates the immediate production sign-in failure is currently upstream of both Google and email flows: the Railway API service is crashed, so the frontend cannot reach the tRPC email procedures or Google OAuth route.

The live authenticated enterprise browser session previously rendered the enterprise workspace successfully on release `5c501353`; the current API outage affects subsequent authenticated API requests and sign-in attempts, not the previously verified frontend static shell.

## Railway dashboard confirmation

The authenticated Railway project dashboard at the Zylobridge production service showed `api.zylobridge.com` with status `Crashed`, one replica, and the latest GitHub deployment labeled `Phase 73 live verification follow-up`. This confirms the 502 is a backend deployment/runtime outage rather than a Google-only or email-only frontend defect.

## Deployment page confirmation

The Railway deployment page for the latest GitHub revision showed the production service as `Crashed`, with the `Restart` action available and a `View logs` link. The service domain shown was `api.zylobridge.com`. No restart or deployment action was performed during this inspection.

## Startup log evidence

The latest Railway deployment log shows the container starting with `NODE_ENV=production node dist/index.js`, but the service remains crashed and no application startup line is present in the visible log rows. This narrows the failure to process startup or the deployment/runtime environment before the application emits its normal listening/health messages. No Railway restart was triggered from the dashboard.

## Restart attempt status

The authenticated Railway service page did not reload into the service controls after navigation; the browser ended at `about:blank`. No restart, variable edit, deployment change, or other Railway operation was performed. The production API therefore remains unverified after the authentication recovery checkpoint.

## Post-release recovery check

After checkpoint `33f686f0`, `https://api.zylobridge.com/api/health` returned HTTP 200 with `{"status":"ok",...}`. The published Vercel sign-in route rendered after its intentional loading state and the public home route rendered with the restored navigation and live-data metric placeholders. The Google and email choices were present in the sign-in surface. No Google consent screen was opened and no email OTP was requested.

## Final public sign-in smoke test

At `https://zylobridge.com/sign-in?release=a8427c14`, the page rendered successfully after the loading state. The Google link resolved to `https://api.zylobridge.com/api/auth/google`, and the email OTP option was visible. This was a non-destructive smoke test: neither the Google link nor the email option was activated, so no OAuth session, OTP email, or production account change occurred.
