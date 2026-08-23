import { resolve } from "node:path";

import sharp from "sharp";

const source = resolve("public/icons/icon-source.svg");
const outputs = [
  [180, "icon-180.png"],
  [192, "icon-192.png"],
  [512, "icon-512.png"],
];

await Promise.all(
  outputs.map(([size, filename]) =>
    sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(resolve("public/icons", filename)),
  ),
);

const maskableArtwork = await sharp(source).resize(410, 410).png().toBuffer();
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: "#17324d",
  },
})
  .composite([{ input: maskableArtwork, left: 51, top: 51 }])
  .png({ compressionLevel: 9 })
  .toFile(resolve("public/icons/icon-maskable-512.png"));

process.stdout.write(`Generated ${outputs.length + 1} original app icons.\n`);
