import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImg = path.resolve('public/assets/aistudio/Ramakrishna_Students_Home_Duty_Assigner_fb337d9c.png');

async function generate() {
  console.log('Source image exists:', fs.existsSync(sourceImg));
  
  // 1. 512x512 standard
  await sharp(sourceImg)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile('public/pwa-512x512.png');
  console.log('Generated pwa-512x512.png');

  // 2. 192x192 standard
  await sharp(sourceImg)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile('public/pwa-192x192.png');
  console.log('Generated pwa-192x192.png');

  // 3. Apple Touch Icon 180x180
  await sharp(sourceImg)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile('public/apple-touch-icon.png');
  console.log('Generated apple-touch-icon.png');

  // 4. Maskable 512x512 with 80% safe zone padding
  // Android maskable requires 10-15% margin so outer borders don't get cropped
  const safeInner = await sharp(sourceImg)
    .resize(410, 410, { fit: 'contain', background: { r: 8, g: 13, b: 25, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 8, g: 13, b: 25, alpha: 1 } // #080d19 theme background
    }
  })
  .composite([
    {
      input: safeInner,
      top: 51,
      left: 51
    }
  ])
  .png({ quality: 95 })
  .toFile('public/pwa-maskable-512x512.png');
  console.log('Generated pwa-maskable-512x512.png with safe-zone margin');

  // 5. favicon
  await sharp(sourceImg)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile('public/favicon.ico');
  console.log('Generated favicon.ico');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
