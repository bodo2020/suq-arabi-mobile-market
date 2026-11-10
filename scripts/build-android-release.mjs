import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * npm run android:release
 * Builds the web app, syncs Android, and produces the signed Play bundle:
 * android/app/build/outputs/bundle/release/app-release.aab
 */
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('npm', ['run', 'android:sync'], process.cwd());
const androidDir = path.join(process.cwd(), 'android');
// Full path: Windows does not always look in the working folder for a bare name.
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(process.platform === 'win32' ? `"${gradlew}"` : gradlew, ['bundleRelease'], androidDir);
console.log('\nPlay bundle: android/app/build/outputs/bundle/release/app-release.aab');
