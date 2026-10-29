import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// The supplied Super Marko badge, compressed as a lossless 384px PNG.
// Store the source in text form so GitHub's contents API can version it.
// Unlike the old logo, this is the same official icon used by the web UI.
const sourcePath = 'resources/super-marko/launcher-384.base64.txt';
const expectedSha256 = '15ad94e9a34a52bdc85643dc3b1e53dae21b63d9ee615e82eeae42fcf3ca94be';
const outputs = [
  'resources/android-brand/super-marko-logo.png',
  'public/super-marko-logo.png',
];

const base64 = (await readFile(sourcePath, 'utf8')).trim();
if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
  throw new Error('Super Marko launcher source is not valid Base64.');
}
const png = Buffer.from(base64, 'base64');
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const end = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const hash = createHash('sha256').update(png).digest('hex');

if (!png.subarray(0, 8).equals(signature) || !png.subarray(-12).equals(end)) {
  throw new Error('Super Marko launcher image is not a complete PNG.');
}
if (hash !== expectedSha256) {
  throw new Error(`Super Marko icon checksum mismatch: expected ${expectedSha256}, got ${hash}`);
}

for (const output of outputs) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, png);
}
console.log(`Super Marko official launcher assets ready (${png.length} bytes, SHA256 verified).`);
