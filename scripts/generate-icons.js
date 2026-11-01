import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write high quality SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4e7a" />
      <stop offset="100%" stop-color="#0f2b48" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.25" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#grad)" />
  <!-- Document paper sheet -->
  <g filter="url(#shadow)">
    <rect x="110" y="80" width="292" height="352" rx="28" fill="#ffffff" />
    <!-- Blue top accent header -->
    <rect x="110" y="80" width="292" height="74" rx="28" fill="#2563eb" />
    <rect x="110" y="126" width="292" height="28" fill="#2563eb" />
    
    <!-- Document lines -->
    <rect x="150" y="190" width="212" height="16" rx="8" fill="#e2e8f0" />
    <rect x="150" y="226" width="140" height="16" rx="8" fill="#e2e8f0" />
    <rect x="150" y="262" width="212" height="16" rx="8" fill="#e2e8f0" />
    
    <!-- Shekel badge / checkmark -->
    <circle cx="256" cy="350" r="44" fill="#10b981" />
    <!-- Shekel ₪ symbol -->
    <path d="M242 328 v44 h-12 v-32 h-10 v-12 h22 z M270 328 v44 h-12 v-44 h12 z M282 328 v32 h10 v12 h-22 v-44 h12 z" fill="#ffffff" />
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

// Function to generate raw RGBA PNG buffer using pure Node.js (zlib)
function createPng(width, height, isMaskable = false) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineLength + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const cornerR = width * (isMaskable ? 0.05 : 0.22);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (scanlineLength + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;

      // Check if inside main card or background
      // Background gradient: #1d4e7a to #0f2b48
      const t = (x + y) / (width + height);
      let r = Math.round(29 * (1 - t) + 15 * t);
      let g = Math.round(78 * (1 - t) + 43 * t);
      let b = Math.round(122 * (1 - t) + 72 * t);
      let a = 255;

      // If not maskable, clip to rounded rect
      if (!isMaskable) {
        let inside = true;
        const dx = Math.abs(x - cx) - (cx - cornerR);
        const dy = Math.abs(y - cy) - (cy - cornerR);
        if (dx > 0 && dy > 0) {
          if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
        }
        if (!inside) {
          r = 0; g = 0; b = 0; a = 0;
        }
      }

      // Draw document sheet in center
      const docW = width * 0.58;
      const docH = height * 0.70;
      const docX = cx - docW / 2;
      const docY = cy - docH / 2;
      const docR = docW * 0.1;

      if (a === 255 && x >= docX && x <= docX + docW && y >= docY && y <= docY + docH) {
        // Doc inner
        let inDoc = true;
        const ddx = Math.abs(x - cx) - (docW / 2 - docR);
        const ddy = Math.abs(y - cy) - (docH / 2 - docR);
        if (ddx > 0 && ddy > 0 && ddx * ddx + ddy * ddy > docR * docR) {
          inDoc = false;
        }

        if (inDoc) {
          // Check if top header of doc (blue band)
          if (y < docY + docH * 0.22) {
            r = 37; g = 99; b = 235; // #2563eb
          } else {
            // White sheet
            r = 255; g = 255; b = 255;

            // Check if document horizontal lines
            const line1Y = docY + docH * 0.35;
            const line2Y = docY + docH * 0.46;
            const lineH = Math.max(3, height * 0.035);

            if (Math.abs(y - line1Y) < lineH / 2 && x > docX + docW * 0.15 && x < docX + docW * 0.85) {
              r = 226; g = 232; b = 240;
            } else if (Math.abs(y - line2Y) < lineH / 2 && x > docX + docW * 0.15 && x < docX + docW * 0.65) {
              r = 226; g = 232; b = 240;
            }

            // Green emblem at bottom center
            const emblemCy = docY + docH * 0.75;
            const emblemR = docW * 0.18;
            const edx = x - cx;
            const edy = y - emblemCy;
            if (edx * edx + edy * edy <= emblemR * emblemR) {
              r = 16; g = 185; b = 129; // Emerald green
              // Cross/check mark inside emblem
              if (Math.abs(edx) < emblemR * 0.5 && Math.abs(edy) < emblemR * 0.15) {
                r = 255; g = 255; b = 255;
              } else if (Math.abs(edy) < emblemR * 0.5 && Math.abs(edx) < emblemR * 0.15) {
                r = 255; g = 255; b = 255;
              }
            }
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const full = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(full), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressedData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('PWA icons created successfully in public/');
