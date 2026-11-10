# Google Play release (سوبر ماركو)

## 1. Create the upload key (once)

Run in a terminal on your machine. You choose the passwords; nobody else needs them.

```powershell
mkdir "$env:USERPROFILE\super-marko-signing"
& "C:\Program Files\Java\jdk-21\bin\keytool.exe" -genkeypair -v -keystore "$env:USERPROFILE\super-marko-signing\super-marko-upload.jks" -alias super-marko -keyalg RSA -keysize 2048 -validity 10000
```

Then create `%USERPROFILE%\super-marko-signing\release.properties` (Notepad is fine):

```properties
storeFile=super-marko-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=super-marko
keyPassword=YOUR_KEY_PASSWORD
```

**Back up the whole `super-marko-signing` folder** (USB / Google Drive) and keep the passwords
somewhere safe. With Play App Signing this is only the *upload* key: if it is ever lost, Play
support can reset it, but that takes days.

The folder can be elsewhere: set the environment variable `SUPER_MARKO_SIGNING` to the full
path of `release.properties`.

## 2. Build the Play bundle

```bash
npm run android:release
```

The file to upload is copied to **`Desktop\Super Marko releases\SuperMarko-<versionName>-v<versionCode>.aab`** (OneDrive Desktop when it exists); the command prints the exact path. The original stays at `android/app/build/outputs/bundle/release/app-release.aab`.

## 3. Every new upload

Increase `versionCode` (1 → 2 → 3 …) in `android-release.json`, and update `versionName`
(what customers see, e.g. `1.0.1`). Play rejects a bundle whose `versionCode` was used before.
