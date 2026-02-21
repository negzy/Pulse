/**
 * Generates icon16.png and icon48.png for the extension (orange #f97316).
 * Run: npm run extension:icons
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'icons');
const ORANGE = { r: 249, g: 115, b: 22, a: 255 };

function writePng(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      png.data[i] = ORANGE.r;
      png.data[i + 1] = ORANGE.g;
      png.data[i + 2] = ORANGE.b;
      png.data[i + 3] = ORANGE.a;
    }
  }
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  return new Promise((resolve, reject) => {
    png.pack()
      .pipe(fs.createWriteStream(outPath))
      .on('finish', () => { console.log('Written', outPath); resolve(); })
      .on('error', reject);
  });
}

(async () => {
  await Promise.all([writePng(16), writePng(48)]);
})().catch((e) => { console.error(e); process.exit(1); });
