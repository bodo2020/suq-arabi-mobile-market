import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * npm run android:release
 * Builds the web app, syncs Android, produces the signed Play bundle and
 * copies it to a fixed place on the Desktop, named by version:
 *   <Desktop>\Super Marko releases\SuperMarko-<versionName>-v<versionCode>.aab
 * (Desktop = OneDrive\Desktop when it exists, else %USERPROFILE%\Desktop).
 * Original: android/app/build/outputs/bundle/release/app-release.aab
 */
const run = (command, args, cwd, env = process.env) => {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Push notifications are compiled out unless the web build says Firebase is configured
// (see src/services/pushNotifications.ts). prepare-android.mjs copies this config into
// android/app, so turn push on for every Play build that has it.
const firebaseConfig = 'config/firebase/google-services.customer.json';
const pushEnv = existsSync(firebaseConfig) ? { ...process.env, VITE_NATIVE_PUSH_CONFIGURED: 'true' } : process.env;
if (!existsSync(firebaseConfig)) console.warn(`No ${firebaseConfig}: this bundle ships WITHOUT push notifications.`);
run('npm', ['run', 'android:sync'], process.cwd(), pushEnv);
const androidDir = path.join(process.cwd(), 'android');
// Full path: Windows does not always look in the working folder for a bare name.
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(process.platform === 'win32' ? `"${gradlew}"` : gradlew, ['bundleRelease'], androidDir);

const bundle = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const { versionCode, versionName } = JSON.parse(readFileSync('android-release.json', 'utf8'));
const home = os.homedir();
const desktop = [path.join(home, 'OneDrive', 'Desktop'), path.join(home, 'Desktop')].find(dir => existsSync(dir)) || home;
const releasesDir = path.join(desktop, 'Super Marko releases');
mkdirSync(releasesDir, { recursive: true });
const target = path.join(releasesDir, `SuperMarko-${versionName}-v${versionCode}.aab`);
copyFileSync(bundle, target);

console.log(`\nPlay bundle ready to upload:\n  ${target}\n(also at android/app/build/outputs/bundle/release/app-release.aab)`);
