import { readFile, writeFile } from 'node:fs/promises';

// Customer MainActivity uses Google Play Core flexible in-app updates.
// Ensure the Android dependency is installed whenever Capacitor regenerates
// android/, without replacing the existing MainActivity or changing appId.
const path = 'android/app/build.gradle';
let gradle = await readFile(path, 'utf8');
const dependency = 'implementation "com.google.android.play:app-update:2.1.0"';
if (!gradle.includes(dependency)) {
  if (!gradle.includes('dependencies {')) {
    throw new Error('Android Gradle dependencies block not found');
  }
  gradle = gradle.replace('dependencies {','dependencies {\n    ' + dependency);
  await writeFile(path,gradle,'utf8');
}
console.log('Play flexible-update Java dependency configured for customer APK.');
