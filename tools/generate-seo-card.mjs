import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconPath = path.join(root, "assets", "brand", "icon-512.png");
const outputPath = path.join(root, "assets", "brand", "vietpatch-social-card.png");
const iconData = (await readFile(iconPath)).toString("base64");

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0H0V64" fill="none" stroke="#171714" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ef3c2e"/>
      <stop offset="1" stop-color="#ff5a36"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#f5f1e8"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="0" y="0" width="28" height="630" fill="#11110f"/>
  <rect x="28" y="0" width="8" height="630" fill="url(#accent)"/>
  <image href="data:image/png;base64,${iconData}" x="92" y="78" width="126" height="126"/>
  <text x="252" y="150" fill="#11110f" font-family="Arial, sans-serif" font-size="70" font-weight="800" letter-spacing="5">VIETPATCH</text>
  <rect x="253" y="176" width="330" height="8" fill="url(#accent)"/>
  <text x="92" y="330" fill="#11110f" font-family="Arial, sans-serif" font-size="58" font-weight="800">Thư viện Việt hóa game PC</text>
  <text x="94" y="405" fill="#625e55" font-family="Arial, sans-serif" font-size="27" font-weight="600">Phiên bản rõ ràng · Tiến độ minh bạch · Trạng thái kiểm thử</text>
  <line x1="92" y1="474" x2="1108" y2="474" stroke="#11110f" stroke-width="2"/>
  <text x="94" y="535" fill="#11110f" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="3">VIETPATCH.ONLINE</text>
  <rect x="1000" y="508" width="108" height="36" fill="#11110f"/>
  <rect x="1081" y="508" width="27" height="36" fill="url(#accent)"/>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, palette: true })
  .toFile(outputPath);

console.log(`Generated ${path.relative(root, outputPath)} (1200x630).`);
