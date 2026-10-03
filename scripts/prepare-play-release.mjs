import { readFile, writeFile } from 'node:fs/promises';

const file = 'android/app/build.gradle';
let gradle = await readFile(file, 'utf8');
const marker = '// Super Marko release support';
if (!gradle.includes(marker)) {
  gradle += `
${marker}
dependencies {
    implementation 'com.google.android.play:app-update:2.1.0'
}
def releaseStorePath = System.getenv('ANDROID_KEYSTORE_PATH')
def stableDebugStorePath = System.getenv('ANDROID_DEBUG_KEYSTORE_PATH')
android {
    signingConfigs {
        if (releaseStorePath) {
            release {
                storeFile file(releaseStorePath)
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
        if (stableDebugStorePath) {
            debug {
                storeFile file(stableDebugStorePath)
                storePassword System.getenv('ANDROID_DEBUG_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_DEBUG_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_DEBUG_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            if (releaseStorePath) signingConfig signingConfigs.release
        }
    }
}
// Never silently produce an unsigned release or substitute a new signing identity.
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name == 'assembleRelease' || it.name == 'bundleRelease' }) {
        ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'].each { name ->
            if (!System.getenv(name)) throw new GradleException('Missing release signing setting: ' + name)
        }
    }
}
`;
  await writeFile(file, gradle, 'utf8');
}
console.log('Play update dependency and environment-based release signing configured.');
