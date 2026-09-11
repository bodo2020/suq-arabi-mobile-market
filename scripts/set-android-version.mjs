import { readFile, writeFile } from 'node:fs/promises';

const gradlePath = 'android/app/build.gradle';
const runNumber = Number(process.env.GITHUB_RUN_NUMBER || process.env.APP_BUILD_NUMBER || 1);
const versionBase = String(process.env.APP_VERSION_BASE || '1.2').trim();
const versionName = String(process.env.APP_VERSION_NAME || `${versionBase}.${runNumber}`).trim();
const baseCode = Number(process.env.APP_VERSION_CODE_BASE || 120000);
const versionCode = Number(process.env.APP_VERSION_CODE || baseCode + runNumber);

if (!Number.isInteger(runNumber) || runNumber < 1) throw new Error('Invalid Android build number.');
if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error('Invalid Android versionCode.');
if (!/^\d+\.\d+(?:\.\d+)?(?:[-+._A-Za-z0-9]*)?$/.test(versionName)) throw new Error(`Invalid Android versionName: ${versionName}`);

let gradle = await readFile(gradlePath, 'utf8');

if (!/versionCode\s*(?:=\s*)?\d+/.test(gradle) || !/versionName\s*(?:=\s*)?["'][^"']+["']/.test(gradle)) {
  throw new Error(`Could not find versionCode/versionName in ${gradlePath}.`);
}

gradle = gradle
  .replace(/versionCode\s*(?:=\s*)?\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s*(?:=\s*)?["'][^"']+["']/, `versionName "${versionName}"`);

await writeFile(gradlePath, gradle, 'utf8');
console.log(`Android version applied: ${versionName} (${versionCode})`);
