# HMS App APK Deployment Guide

This guide is for repeatable APK builds while your system is under active development.

## What is already configured

- EAS build profiles: [eas.json](eas.json)
- Dynamic Expo config with `EAS_PROJECT_ID`: [app.config.js](app.config.js)
- Build scripts: [package.json](package.json)
- GitHub Actions APK pipeline: [.github/workflows/build-android-apk.yml](.github/workflows/build-android-apk.yml)
- Existing mobile web deploy remains unchanged: [.github/workflows/deploy-mobile-web-firebase.yml](.github/workflows/deploy-mobile-web-firebase.yml)

## Build outputs

- `preview` profile => APK for direct install
- `production` profile => AAB for Play Store (optional for future)

For `preview` builds, workflow also updates a prerelease tag: `apk-latest`.

## OTA updates (no Play Store required)

OTA is now configured for this app using EAS Update (channels/branches).

- Expo config uses:
  - `runtimeVersion: { policy: "appVersion" }`
  - `updates.url: https://u.expo.dev/<EAS_PROJECT_ID>`
- OTA publish workflow:
  - [.github/workflows/publish-ota-update.yml](.github/workflows/publish-ota-update.yml)

### Important first-time rule

Users must install at least one APK built **after OTA config** to enable OTA on their devices.
After that, JS/UI-only changes can be delivered without reinstall.

### Channel/branch model used

- `preview` build channel -> publish OTA to `preview` branch
- `production` build channel -> publish OTA to `production` branch

Use matching build/update lanes to avoid sending wrong updates to devices.

## One-time setup required from your side

### 1) Expo account token
Create Expo token and save in GitHub repo secrets (`HMS-app` repo):
- `EXPO_TOKEN`

### 2) EAS project id
Create/get EAS project id and save in GitHub repo secrets:
- `EAS_PROJECT_ID`

How to get project id once:
1. In local HMS-app folder, run `npx eas-cli project:init` (or `eas project:init`) after Expo login.
2. Copy generated project id.
3. Add it as `EAS_PROJECT_ID` in GitHub Secrets.

### 3) Existing mobile web secrets (already used)
Keep these in GitHub repo secrets:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_TOKEN`

## How to build APK (no code changes needed)

### Option A: From GitHub Actions UI
1. Open `HMS-app` repo -> Actions -> **Build Android APK**.
2. Click **Run workflow**.
3. Choose profile `preview`.
4. Download APK from:
   - Action artifacts, or
   - Release tag `apk-latest` asset.

### Option B: Auto on push to main
Workflow triggers on source changes and builds automatically.

## How to publish OTA update

1. Open `HMS-app` repo -> Actions -> **Publish OTA Update**.
2. Click **Run workflow**.
3. Select branch:
  - `preview` for tester/internal devices
  - `production` for stable devices
4. Add short message (example: `fix: remove kitchenStyles route crash`).
5. Run workflow and verify Group ID in summary.

Devices with matching runtime/channel receive update on next app launch.

## Safe deployment strategy (recommended)

- Keep web app live on Firebase.
- Build `preview` APK for testers.
- Share only latest APK release link.
- Repeat on each important change.

## Download link pattern for website

After first successful `preview` release:
- Release page URL pattern:
  `https://github.com/<org>/<repo>/releases/tag/apk-latest`

Use that URL behind your website “Download APK” button.

## Validation checklist per build

1. Install APK on Android device.
2. Open app and login.
3. Verify API calls work.
4. Verify socket updates work.
5. Verify order flow: table -> order -> kitchen -> billing.

## Troubleshooting

- If workflow fails with EAS auth error: `EXPO_TOKEN` is missing/invalid.
- If workflow fails with project id error: `EAS_PROJECT_ID` missing.
- If app opens but API fails in browser: backend CORS/deploy not updated yet.

## ChatGPT prompts you can reuse

### Prompt: create a new preview APK
"Build new Android preview APK from HMS-app GitHub Actions using profile preview. Check run logs, confirm artifact name, and give me install link."

### Prompt: investigate failed APK build
"Analyze failed Build Android APK workflow in HMS-app. Identify exact failing step, root cause, and give minimum fix changes."

### Prompt: verify deployment end-to-end
"Verify HMS app deployment end-to-end: APK installs, login works, orders/tables/menu APIs work, sockets connect, and provide a pass/fail report."
