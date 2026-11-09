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
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(gradlew, ['bundleRelease'], path.join(process.cwd(), 'android'));
console.log('\nPlay bundle: android/app/build/outputs/bundle/release/app-release.aab');
