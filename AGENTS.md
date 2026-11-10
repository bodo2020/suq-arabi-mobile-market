# AGENTS.md

## Rules
- The `customer-smart-ideas` edge function calls Google Gemini directly with the vault key `GEMINI_API_KEY`; retired model names (e.g. `gemini-2.5-*`) return 404 that surfaces to customers as a 503 `ai_temporarily_unavailable`. Keep the model on a currently available generation (as of 2026-10-30: `gemini-3.5-flash-lite`) and log provider status/body on failure.

## Google Play release (Android customer app «سوبر ماركو»)
- Package `com.elmadawy.market.customer` (never change it). Capacitor 8, target SDK 36, edge-to-edge (see `src/components/NativeStatusBarSync.tsx`, `--safe-area-*` in `src/index.css`).
- The `android/` folder is generated and git-ignored. Native changes go in `scripts/prepare-android*.mjs`, which `npm run android:sync` re-applies; never edit only `android/`.
- **Build the upload file:** `npm run android:release`. It copies the signed bundle to `<Desktop>\Super Marko releases\SuperMarko-<versionName>-v<versionCode>.aab` (Desktop is `%USERPROFILE%\OneDrive\Desktop` on this machine) and prints the path. That `.aab` is what gets uploaded to Play Console.
- **Before every upload**, raise `versionCode` (1, 2, 3, …) and set `versionName` in `android-release.json`. Play rejects a reused versionCode.
- **Upload key:** `%USERPROFILE%\super-marko-signing\` holds `super-marko-upload.jks` (alias `super-marko`) and `release.properties` (passwords), or the path in env `SUPER_MARKO_SIGNING`. It is outside the repo on purpose: never copy it into the repo, never commit it, never print or read the passwords, and never create or change the key or its passwords for the owner; they do that themselves. Play App Signing is on, so this is only the upload key. Signer: `CN=Super Marko, O=Elmadawy Market, C=EG`, SHA-256 `4D:EF:79:37:4F:8A:5C:69:C5:EB:E1:FD:55:F8:3F:26:CE:5F:6F:92:28:49:B0:12:44:92:A1:E7:92:27:1D:DD`.
- If the key file is missing, release builds stop with "Release signing file not found" (debug builds still work). Details: `ANDROID-RELEASE.md`.
- Play listing pages: `public/privacy.html` (privacy policy) and `public/delete-account.html` (account deletion; WhatsApp 01005245096). In-app deletion: `src/pages/DeleteAccount.tsx` → RPC `delete_my_customer_account_v1`.
