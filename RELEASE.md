# mora - Build & Release Guide

This document describes how to package, code sign, and release **mora** for macOS and Linux.

## Prerequisites

*   **Node.js**: Version 20
*   **Rust**: Stable toolchain (rustc/cargo)
*   **System Dependencies (Linux Only)**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential libssl-dev
    ```

## Local Packaging Build

To compile the production frontend and bundle the desktop app locally, run:
```bash
npm run build:desktop
```

### Output Artifact Locations

*   **macOS**:
    *   App bundle: `src-tauri/target/release/bundle/macos/mora.app`
    *   Disk Image: `src-tauri/target/release/bundle/dmg/mora_0.1.0_x64.dmg` (or `mora_0.1.0_aarch64.dmg` on Apple Silicon)
*   **Linux**:
    *   Debian package: `src-tauri/target/release/bundle/deb/mora_0.1.0_amd64.deb`
    *   AppImage: `src-tauri/target/release/bundle/appimage/mora_0.1.0_amd64.AppImage`

*Note: Cross-compiling is not natively supported by Tauri. Build macOS targets on macOS and Linux targets on Linux.*

## Running Unsigned (macOS Gatekeeper)

When running the unsigned `.app` bundle locally:
1. Double-clicking may trigger a Gatekeeper block ("mora cannot be opened...").
2. To bypass, **right-click (or Ctrl+click)** `mora.app` -> choose **Open** -> click **Open** in the prompt.
3. This is only necessary for first run and does not require a paid Apple Developer account.

## Code Signing & Notarization (Optional)

If distributing the app to external users, you should sign the packages:

### macOS Notarization
Requires a paid Apple Developer account. Set the following environment variables during the build process:
*   `APPLE_CERTIFICATE`: Base64-encoded signing certificate (`.p12` file).
*   `APPLE_CERTIFICATE_PASSWORD`: Password for the certificate.
*   `APPLE_SIGNING_IDENTITY`: Developer ID Application name (e.g. `Developer ID Application: Your Name (Team ID)`).
*   `APPLE_ID`: Your Apple ID email address.
*   `APPLE_PASSWORD`: App-specific password generated on appleid.apple.com.
*   `APPLE_TEAM_ID`: Your Apple Developer Team ID.

### Linux Signing
AppImage and Deb files do not require signing for distribution.

## CI Release Process

GitHub Actions builds both platforms automatically when you push a semantic tag:
1. Update `"version"` in `package.json` and `"version"` in `src-tauri/tauri.conf.json` to the same value (e.g. `0.1.0`).
2. Create and push a tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. The CI workflow builds both targets, uploads build artifacts, and drafts a GitHub release with the DMG, AppImage, and Debian packages attached.
