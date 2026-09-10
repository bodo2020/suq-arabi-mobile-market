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

let styles;
try {
  styles = await readFile(stylesPath, 'utf8');
} catch (error) {
  console.error(`styles.xml was not found at ${stylesPath}.`);
  throw error;
}

const themeMatch = styles.match(/<style\s+name="(AppTheme\.NoActionBar|AppTheme)"[^>]*>/);
if (!themeMatch) {
  throw new Error('Could not find an Android app theme to configure system bars.');
}
const themeName = themeMatch[1];

function upsertThemeItem(name, value) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const itemPattern = new RegExp(`<item\\s+name="${escapedName}"[^>]*>[^<]*<\\/item>`);
  const replacement = `<item name="${name}">${value}</item>`;
  if (itemPattern.test(styles)) {
    styles = styles.replace(itemPattern, replacement);
    return;
  }
  const openingTheme = new RegExp(`(<style\\s+name="${themeName.replace('.', '\\.')}"[^>]*>)`);
  styles = styles.replace(openingTheme, `$1\n        ${replacement}`);
}

// Android 15 can force WebViews edge-to-edge. Keep the web layout outside the
// system bars and make those bars part of the Elmadawy visual identity.
upsertThemeItem('android:windowOptOutEdgeToEdgeEnforcement', 'true');
upsertThemeItem('android:statusBarColor', '#005931');
upsertThemeItem('android:navigationBarColor', '#F6F8F7');
upsertThemeItem('android:windowLightStatusBar', 'false');
upsertThemeItem('android:windowLightNavigationBar', 'true');
upsertThemeItem('android:enforceStatusBarContrast', 'false');
upsertThemeItem('android:enforceNavigationBarContrast', 'false');

await writeFile(stylesPath, styles, 'utf8');

console.log('Android native configuration prepared: camera, location, keyboard resize, branded system bars and safe insets are enabled.');
