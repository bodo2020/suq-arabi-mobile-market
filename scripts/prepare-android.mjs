import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const stylesPath = 'android/app/src/main/res/values/styles.xml';
const brandLogoPath = 'resources/android-brand/super-marko-icon.png';
const resRoot = 'android/app/src/main/res';

const requiredPermissions = [
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
];

// Fail the build immediately if the brand file is not a real PNG.
// This protects launcher, top-bar and splash assets from silently shipping corrupted bytes.
const logoBytes = await readFile(brandLogoPath);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (logoBytes.length < 8 || !logoBytes.subarray(0, 8).equals(pngSignature)) {
  throw new Error(`${brandLogoPath} is not a valid PNG file.`);
}

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

manifest = manifest.replace(/android:label="[^"]*"/, 'android:label="@string/app_name"');

await writeFile(manifestPath, manifest, 'utf8');

let styles;
try {
  styles = await readFile(stylesPath, 'utf8');
} catch (error) {
  console.error(`styles.xml was not found at ${stylesPath}.`);
  throw error;
}

function upsertItemInStyle(source, styleName, itemName, value) {
  const escapedStyle = styleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedItem = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stylePattern = new RegExp(`(<style\\s+name="${escapedStyle}"[^>]*>)([\\s\\S]*?)(<\\/style>)`);
  const match = source.match(stylePattern);
  if (!match) return source;

  const itemPattern = new RegExp(`<item\\s+name="${escapedItem}"[^>]*>[\\s\\S]*?<\\/item>`);
  const replacement = `<item name="${itemName}">${value}</item>`;
  const body = itemPattern.test(match[2])
    ? match[2].replace(itemPattern, replacement)
    : `${match[2]}\n        ${replacement}`;

  return source.replace(stylePattern, `${match[1]}${body}${match[3]}`);
}

const appThemeName = styles.includes('name="AppTheme.NoActionBar"') ? 'AppTheme.NoActionBar' : 'AppTheme';
// Android 16 ignores the edge-to-edge opt-out for target SDK 36.
styles = styles.replace(/\s*<item name="android:windowOptOutEdgeToEdgeEnforcement">[^<]*<\/item>/g, '');
styles = upsertItemInStyle(styles, appThemeName, 'android:statusBarColor', '#005931');
styles = upsertItemInStyle(styles, appThemeName, 'android:navigationBarColor', '#F6F8F7');
styles = upsertItemInStyle(styles, appThemeName, 'android:windowLightStatusBar', 'false');
styles = upsertItemInStyle(styles, appThemeName, 'android:windowLightNavigationBar', 'true');
styles = upsertItemInStyle(styles, appThemeName, 'android:enforceStatusBarContrast', 'false');
styles = upsertItemInStyle(styles, appThemeName, 'android:enforceNavigationBarContrast', 'false');

// Configure both legacy and Android 12+ splash APIs on Capacitor's launch theme.
if (styles.includes('name="AppTheme.NoActionBarLaunch"')) {
  styles = upsertItemInStyle(styles, 'AppTheme.NoActionBarLaunch', 'android:background', '@drawable/super_marko_splash');
  styles = upsertItemInStyle(styles, 'AppTheme.NoActionBarLaunch', 'android:windowBackground', '@drawable/super_marko_splash');
  styles = upsertItemInStyle(styles, 'AppTheme.NoActionBarLaunch', 'windowSplashScreenBackground', '@color/super_marko_splash_background');
  styles = upsertItemInStyle(styles, 'AppTheme.NoActionBarLaunch', 'windowSplashScreenAnimatedIcon', '@drawable/super_marko_splash_icon');
  styles = upsertItemInStyle(styles, 'AppTheme.NoActionBarLaunch', 'postSplashScreenTheme', '@style/AppTheme.NoActionBar');
}
await writeFile(stylesPath, styles, 'utf8');

const colorsPath = path.join(resRoot, 'values', 'colors.xml');
let colors = '';
try {
  colors = await readFile(colorsPath, 'utf8');
} catch {
  colors = '<resources>\n</resources>\n';
}

const upsertColor = (name, value) => {
  const pattern = new RegExp(`<color\\s+name="${name}"[^>]*>[^<]*<\\/color>`);
  const replacement = `<color name="${name}">${value}</color>`;
  if (pattern.test(colors)) {
    colors = colors.replace(pattern, replacement);
  } else {
    colors = colors.replace('</resources>', `    ${replacement}\n</resources>`);
  }
};
upsertColor('super_marko_icon_background', '#005931');
upsertColor('super_marko_splash_background', '#005931');
await writeFile(colorsPath, colors, 'utf8');

const stringsPath = path.join(resRoot, 'values', 'strings.xml');
let strings = await readFile(stringsPath, 'utf8');
const appName = '<string name="app_name">ســــــوبـرمــــاركو</string>';
strings = /<string\s+name="app_name"[^>]*>[^<]*<\/string>/.test(strings)
  ? strings.replace(/<string\s+name="app_name"[^>]*>[^<]*<\/string>/, appName)
  : strings.replace('</resources>', `    ${appName}\n</resources>`);
strings = strings.replace(/<string\s+name="title_activity_main"[^>]*>[^<]*<\/string>/, '<string name="title_activity_main">ســــــوبـرمــــاركو</string>');
await writeFile(stringsPath, strings, 'utf8');

// Remove every default Capacitor launcher bitmap so Android cannot select a stale density asset.
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const density of densities) {
  const dir = path.join(resRoot, `mipmap-${density}`);
  for (const file of [
    'ic_launcher.webp',
    'ic_launcher_round.webp',
    'ic_launcher.png',
    'ic_launcher_round.png',
  ]) {
    await rm(path.join(dir, file), { force: true });
  }
}

const mipmapNodpiDir = path.join(resRoot, 'mipmap-nodpi');
const adaptiveDir = path.join(resRoot, 'mipmap-anydpi-v26');
const drawableNodpiDir = path.join(resRoot, 'drawable-nodpi');
const drawableDir = path.join(resRoot, 'drawable');
await mkdir(mipmapNodpiDir, { recursive: true });
await mkdir(adaptiveDir, { recursive: true });
await mkdir(drawableNodpiDir, { recursive: true });
await mkdir(drawableDir, { recursive: true });

await copyFile(brandLogoPath, path.join(mipmapNodpiDir, 'ic_launcher.png'));
await copyFile(brandLogoPath, path.join(mipmapNodpiDir, 'ic_launcher_round.png'));
await copyFile(brandLogoPath, path.join(drawableNodpiDir, 'super_marko_logo_source.png'));

// Give adaptive launchers a little breathing room so the supplied rounded artwork is never clipped.
const launcherForegroundXml = `<?xml version="1.0" encoding="utf-8"?>\n<inset xmlns:android="http://schemas.android.com/apk/res/android" android:inset="10%">\n    <bitmap android:src="@drawable/super_marko_logo_source" android:gravity="fill" />\n</inset>\n`;
await writeFile(path.join(drawableDir, 'super_marko_launcher_foreground.xml'), launcherForegroundXml, 'utf8');

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/super_marko_icon_background" />\n    <foreground android:drawable="@drawable/super_marko_launcher_foreground" />\n</adaptive-icon>\n`;
await writeFile(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveIcon, 'utf8');
await writeFile(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIcon, 'utf8');

// Remove Capacitor's generated portrait/landscape splash PNGs. They are more specific than
// drawable/splash.xml and were overriding the custom logo on real devices.
const resourceDirs = await readdir(resRoot, { withFileTypes: true });
for (const entry of resourceDirs) {
  if (!entry.isDirectory() || !entry.name.startsWith('drawable-')) continue;
  if (entry.name === 'drawable-nodpi') continue;
  await rm(path.join(resRoot, entry.name, 'splash.png'), { force: true });
}
await rm(path.join(drawableDir, 'splash.png'), { force: true });
await rm(path.join(drawableDir, 'splash.xml'), { force: true });

// Shared splash icon and legacy launch background.
const splashIconXml = `<?xml version="1.0" encoding="utf-8"?>\n<inset xmlns:android="http://schemas.android.com/apk/res/android" android:inset="16%">\n    <bitmap android:src="@drawable/super_marko_logo_source" android:gravity="fill" />\n</inset>\n`;
await writeFile(path.join(drawableDir, 'super_marko_splash_icon.xml'), splashIconXml, 'utf8');

const splashBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:drawable="@color/super_marko_splash_background" />\n    <item android:drawable="@drawable/super_marko_splash_icon" />\n</layer-list>\n`;
await writeFile(path.join(drawableDir, 'super_marko_splash.xml'), splashBackgroundXml, 'utf8');

console.log('Android Super Marko launcher, splash and notification permission are active.');
