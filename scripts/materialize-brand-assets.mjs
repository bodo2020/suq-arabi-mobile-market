import { createHash } from 'node:crypto';
import { copyFile, readFile } from 'node:fs/promises';

const icon = 'resources/android-brand/super-marko-icon.png';
const wordmark = 'public/brand/super-marko-wordmark.svg';
const iconSvg = 'public/brand/super-marko-icon.svg';
const bytes = await readFile(icon);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!bytes.subarray(0, 8).equals(pngSignature)) {
  throw new Error(`${icon} is not a valid PNG`);
}
for (const file of [wordmark, iconSvg]) {
  const source = await readFile(file, 'utf8');
  if (!source.includes('<svg') || !source.includes('#005931')) {
    throw new Error(`${file} is not a valid Super Marko SVG`);
  }
}
await copyFile(icon, 'public/brand/super-marko-icon.png');
console.log(`Super Marko assets verified (${createHash('sha256').update(bytes).digest('hex')}).`);
