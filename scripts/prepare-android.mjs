import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const stylesPath = 'android/app/src/main/res/values/styles.xml';
const brandLogoPath = 'resources/android-brand/elmadawy-logo.png';
const resRoot = 'android/app/src/main/res';

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
if (!themeMatch) throw new Error('Could not find an Android app theme to configure system bars.');
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

upsertThemeItem('android:windowOptOutEdgeToEdgeEnforcement', 'true');
upsertThemeItem('android:statusBarColor', '#005931');
upsertThemeItem('android:navigationBarColor', '#F6F8F7');
upsertThemeItem('android:windowLightStatusBar', 'false');
upsertThemeItem('android:windowLightNavigationBar', 'true');
upsertThemeItem('android:enforceStatusBarContrast', 'false');
upsertThemeItem('android:enforceNavigationBarContrast', 'false');
await writeFile(stylesPath, styles, 'utf8');

// Apply the final Elmadawy customer logo to every Android launcher density.
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const density of densities) {
  const dir = path.join(resRoot, `mipmap-${density}`);
  await mkdir(dir, { recursive: true });
  await rm(path.join(dir, 'ic_launcher.webp'), { force: true });
  await rm(path.join(dir, 'ic_launcher_round.webp'), { force: true });
  await copyFile(brandLogoPath, path.join(dir, 'ic_launcher.png'));
  await copyFile(brandLogoPath, path.join(dir, 'ic_launcher_round.png'));
}

// Adaptive icon on Android 8+: keep the supplied artwork intact while allowing launcher masks.
const adaptiveDir = path.join(resRoot, 'mipmap-anydpi-v26');
const nodpiDir = path.join(resRoot, 'drawable-nodpi');
await mkdir(adaptiveDir, { recursive: true });
await mkdir(nodpiDir, { recursive: true });
await copyFile(brandLogoPath, path.join(nodpiDir, 'elmadawy_launcher_foreground.png'));
await copyFile(brandLogoPath, path.join(nodpiDir, 'elmadawy_splash_logo.png'));

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/elmadawy_icon_background" />\n    <foreground android:drawable="@drawable/elmadawy_launcher_foreground" />\n</adaptive-icon>\n`;
await writeFile(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveIcon, 'utf8');
await writeFile(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIcon, 'utf8');

const colorsPath = path.join(resRoot, 'values', 'colors.xml');
let colors = '';
try { colors = await readFile(colorsPath, 'utf8'); } catch { colors = '<resources>\n</resources>\n'; }
if (!colors.includes('name="elmadawy_icon_background"')) {
  colors = colors.replace('</resources>', '    <color name="elmadawy_icon_background">#005931</color>\n</resources>');
  await writeFile(colorsPath, colors, 'utf8');
}

// Branded launch screen: soft app surface with the supplied logo centered.
const drawableDir = path.join(resRoot, 'drawable');
await mkdir(drawableDir, { recursive: true });
await rm(path.join(drawableDir, 'splash.png'), { force: true });
const splashXml = `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:drawable="#F6F8F7" />\n    <item android:gravity="center" android:width="180dp" android:height="180dp">\n        <bitmap android:src="@drawable/elmadawy_splash_logo" android:gravity="fill" />\n    </item>\n</layer-list>\n`;
await writeFile(path.join(drawableDir, 'splash.xml'), splashXml, 'utf8');

console.log('Android native configuration prepared: permissions, system bars, Elmadawy launcher icon and branded splash are enabled.');
