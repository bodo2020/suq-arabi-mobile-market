import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chunksDir = 'resources/android-brand/base64';
const expectedSha256 = 'd63556bbb390df5869d966f1934a33beb4c9d1513e9b9ed93f972e69210ddd3d';
const outputs = [
  'resources/android-brand/elmadawy-logo.png',
  'public/elmadawy-logo.png',
];

const chunkNames = (await readdir(chunksDir))
  .filter((name) => name.endsWith('.txt'))
  .sort((a, b) => a.localeCompare(b));

if (chunkNames.length === 0) {
  throw new Error('No Elmadawy logo source chunks were found.');
}

const chunks = await Promise.all(
  chunkNames.map(async (name) => (await readFile(path.join(chunksDir, name), 'utf8')).trim()),
);
const png = Buffer.from(chunks.join(''), 'base64');

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngEnd = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const hash = createHash('sha256').update(png).digest('hex');

if (!png.subarray(0, 8).equals(pngSignature)) {
  throw new Error('Elmadawy logo does not start with a valid PNG signature.');
}
if (!png.subarray(-12).equals(pngEnd)) {
  throw new Error('Elmadawy logo PNG is truncated or missing its IEND chunk.');
}
if (hash !== expectedSha256) {
  throw new Error(`Elmadawy logo checksum mismatch. Expected ${expectedSha256}, got ${hash}.`);
}

for (const output of outputs) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, png);
}

console.log(`Elmadawy logo materialized and verified (${png.length} bytes, sha256 ${hash}).`);
