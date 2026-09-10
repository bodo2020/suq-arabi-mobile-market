import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const stylesPath = 'android/app/src/main/res/values/styles.xml';

const requiredPermissions = [
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
];

let manifest;
try {
  manifest = await readFile(manifestPath, 'utf8');
} catch (error) {
  console.error(`AndroidManifest.xml was not found at ${manifestPath}. Run \"npx cap add android\" first.`);
  throw error;
}

for (const permission of requiredPermissions) {
  if (!manifest.includes(`android:name="${permission}"`)) {
    manifest = manifest.replace(
      /\s*<application\b/,
      `\n    <uses-permission android:name="${permission}" />\n\n    <application`,
    );
  }
}

// Keep forms and checkout fields visible while the Android keyboard is open.
if (!manifest.includes('android:windowSoftInputMode=')) {
  manifest = manifest.replace(
    'android:exported="true"',
    'android:exported="true"\n            android:windowSoftInputMode="adjustResize"',
  );
}

await writeFile(manifestPath, manifest, 'utf8');

// Android 15 enforces edge-to-edge for targetSdk 35. Opt out for this WebView shell so
// the customer UI is laid out below/above system bars instead of underneath them.
let styles;
try {
  styles = await readFile(stylesPath, 'utf8');
} catch (error) {
  console.error(`styles.xml was not found at ${stylesPath}.`);
  throw error;
}

if (!styles.includes('android:windowOptOutEdgeToEdgeEnforcement')) {
  const noActionBarTheme = /(<style\s+name="AppTheme\.NoActionBar"[^>]*>)/;
  if (noActionBarTheme.test(styles)) {
    styles = styles.replace(
      noActionBarTheme,
      '$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>',
    );
  } else {
    const appTheme = /(<style\s+name="AppTheme"[^>]*>)/;
    if (!appTheme.test(styles)) {
      throw new Error('Could not find an Android app theme to configure system bar insets.');
    }
    styles = styles.replace(
      appTheme,
      '$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>',
    );
  }
  await writeFile(stylesPath, styles, 'utf8');
}

console.log('Android native configuration prepared: camera, location, keyboard resize and system-bar insets are enabled.');
