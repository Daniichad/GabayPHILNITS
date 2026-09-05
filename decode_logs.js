const fs = require('fs');
const zlib = require('zlib');

try {
  const buffer = fs.readFileSync('eas_logs2.txt');
  let decompressed;
  try {
    decompressed = zlib.gunzipSync(buffer);
  } catch (e) {
    decompressed = zlib.brotliDecompressSync(buffer);
  }
  fs.writeFileSync('eas_logs_decoded.txt', decompressed);
  console.log('Decoded successfully!');
} catch(e) {
  console.error('Failed to decode', e);
}
