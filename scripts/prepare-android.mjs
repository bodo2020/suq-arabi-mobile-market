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

// Remove Capacitor's default density icons and use the supplied artwork as a no-density
// launcher source so Android scales it cleanly instead of interpreting a 700px file as mdpi.
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const density of densities) {
  const dir = path.join(resRoot, `mipmap-${density}`);
  await rm(path.join(dir, 'ic_launcher.webp'), { force: true });
  await rm(path.join(dir, 'ic_launcher_round.webp'), { force: true });
  await rm(path.join(dir, 'ic_launcher.png'), { force: true });
  await rm(path.join(dir, 'ic_launcher_round.png'), { force: true });
}

const mipmapNodpiDir = path.join(resRoot, 'mipmap-nodpi');
const adaptiveDir = path.join(resRoot, 'mipmap-anydpi-v26');
const drawableNodpiDir = path.join(resRoot, 'drawable-nodpi');
await mkdir(mipmapNodpiDir, { recursive: true });
await mkdir(adaptiveDir, { recursive: true });
await mkdir(drawableNodpiDir, { recursive: true });
await copyFile(brandLogoPath, path.join(mipmapNodpiDir, 'ic_launcher.png'));
await copyFile(brandLogoPath, path.join(mipmapNodpiDir, 'ic_launcher_round.png'));
await copyFile(brandLogoPath, path.join(drawableNodpiDir, 'elmadawy_launcher_foreground.png'));
await copyFile(brandLogoPath, path.join(drawableNodpiDir, 'elmadawy_splash_logo.png'));

const colorsPath = path.join(resRoot, 'values', 'colors.xml');
let colors = '';
try { colors = await readFile(colorsPath, 'utf8'); } catch { colors = '<resources>\n</resources>\n'; }
const addColor = (name, value) => {
  if (!colors.includes(`name="${name}"`)) {
    colors = colors.replace('</resources>', `    <color name="${name}">${value}</color>\n</resources>`);
  }
};
addColor('elmadawy_icon_background', '#005931');
addColor('elmadawy_splash_background', '#F6F8F7');
await writeFile(colorsPath, colors, 'utf8');

// Android 8+ adaptive launcher icon. The launcher is free to apply its circle/squircle mask,
// while the supplied artwork remains the visible foreground.
const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/elmadawy_icon_background" />\n    <foreground android:drawable="@drawable/elmadawy_launcher_foreground" />\n</adaptive-icon>\n`;
await writeFile(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveIcon, 'utf8');
await writeFile(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIcon, 'utf8');

// Branded launch screen with a neutral app-surface background and the exact supplied logo.
const drawableDir = path.join(resRoot, 'drawable');
await mkdir(drawableDir, { recursive: true });
await rm(path.join(drawableDir, 'splash.png'), { force: true });
const splashXml = `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:drawable="@color/elmadawy_splash_background" />\n    <item android:gravity="center" android:width="180dp" android:height="180dp">\n        <bitmap android:src="@drawable/elmadawy_splash_logo" android:gravity="fill" />\n    </item>\n</layer-list>\n`;
await writeFile(path.join(drawableDir, 'splash.xml'), splashXml, 'utf8');

console.log('Android native configuration prepared: permissions, system bars, Elmadawy launcher icon and branded splash are enabled.');
