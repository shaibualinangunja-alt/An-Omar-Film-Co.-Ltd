import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, drawFn) {
  // RGBA buffer with 1 byte filter prefix per row
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC32 calculation over type + data
    const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(crcBuf);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    crc32.table = table;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// FREECUT Icon Design: Deep dark background with rounded corner feel, cyan and amber cutting frame geometry
function freecutIconDrawer(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background: Rounded dark rounded rect
  const rCorner = 0.2;
  const inCorner = (nx < rCorner && ny < rCorner && Math.hypot(nx - rCorner, ny - rCorner) > rCorner) ||
                   (nx > 1 - rCorner && ny < rCorner && Math.hypot(nx - (1 - rCorner), ny - rCorner) > rCorner) ||
                   (nx < rCorner && ny > 1 - rCorner && Math.hypot(nx - rCorner, ny - (1 - rCorner)) > rCorner) ||
                   (nx > 1 - rCorner && ny > 1 - rCorner && Math.hypot(nx - (1 - rCorner), ny - (1 - rCorner)) > rCorner);

  if (inCorner) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  // Border glow
  const distFromEdge = Math.min(nx, 1 - nx, ny, 1 - ny);
  if (distFromEdge < 0.04) {
    return [6, 182, 212, 255]; // Cyan border #06B6D4
  }

  // Cyan Play/Cut Triangle on left (Playhead / Cut angle)
  // Triangle 1: (0.28, 0.22) to (0.28, 0.78) to (0.58, 0.50)
  const inTriangle = nx >= 0.28 && nx <= 0.60 &&
                     ny >= 0.22 + (nx - 0.28) * 0.85 &&
                     ny <= 0.78 - (nx - 0.28) * 0.85;

  if (inTriangle) {
    // Gradient cyan to blue
    return [6, 182, 212, 255]; // Vivid Cyan
  }

  // Amber vertical timeline marker / cut slash on right (0.64 <= nx <= 0.74, 0.20 <= ny <= 0.80)
  if (nx >= 0.64 && nx <= 0.74 && ny >= 0.22 && ny <= 0.78) {
    return [245, 158, 11, 255]; // Amber #F59E0B
  }

  // Deep Slate background
  return [15, 23, 42, 255]; // #0F172A
}

function createIco(pngBuffers) {
  // ICO header: 2 bytes reserved (0), 2 bytes type (1 = icon), 2 bytes image count
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let currentOffset = 6 + count * 16;

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = width >= 256 ? 0 : width;
    entry[1] = height >= 256 ? 0 : height;
    entry[2] = 0; // Colors (0 = No palette)
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data
    dirEntries.push(entry);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

// Generate all target icons
const outDir = path.resolve('src-tauri/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating FREECUT production icon set...');

const p32 = createPng(32, 32, freecutIconDrawer);
fs.writeFileSync(path.join(outDir, '32x32.png'), p32);

const p128 = createPng(128, 128, freecutIconDrawer);
fs.writeFileSync(path.join(outDir, '128x128.png'), p128);

const p256 = createPng(256, 256, freecutIconDrawer);
fs.writeFileSync(path.join(outDir, '128x128@2x.png'), p256);

const ico = createIco([
  { width: 32, height: 32, buffer: p32 },
  { width: 128, height: 128, buffer: p128 },
  { width: 256, height: 256, buffer: p256 },
]);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);

console.log('Icon set generated successfully in', outDir);
