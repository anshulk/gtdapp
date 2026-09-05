import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons from icon.svg...');

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');

  // 180x180 for Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  // Maskable 192x192 (with extra safe padding)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-maskable-192.png');

  // Maskable 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-maskable-512.png');

  // Favicon 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.png');

  console.log('Successfully generated all PWA icons!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
