const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc;
});

function pngChunk(type, data = new Uint8Array(0)) {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);

  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, bytes.length - 4)) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  }
  view.setUint32(bytes.length - 4, crc ^ 0xffffffff);
  return bytes;
}

function rgbScanlines(pixels, width, rows) {
  const stride = width * 3 + 1;
  const scanlines = new Uint8Array(stride * rows);

  for (let row = 0; row < rows; row++) {
    let source = row * width * 4;
    let target = row * stride;
    const end = target + stride;
    scanlines[target++] = 1; // PNG Sub filter, relative to the preceding pixel.
    scanlines[target++] = pixels[source++];
    scanlines[target++] = pixels[source++];
    scanlines[target++] = pixels[source++];
    source++; // The export background makes every pixel opaque.

    while (target < end) {
      scanlines[target++] = pixels[source] - pixels[source - 4];
      scanlines[target++] = pixels[source + 1] - pixels[source - 3];
      scanlines[target++] = pixels[source + 2] - pixels[source - 2];
      source += 4;
    }
  }
  return scanlines;
}

export async function encodeTallPng(width, height, tileHeight, renderTile) {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 2; // RGB.
  const chunks = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), pngChunk('IHDR', header)];

  let top = 0;
  const scanlines = new ReadableStream({
    async pull(controller) {
      if (top === height) {
        controller.close();
        return;
      }
      const rows = Math.min(tileHeight, height - top);
      const pixels = await renderTile(top, rows);
      controller.enqueue(rgbScanlines(pixels, width, rows));
      top += rows;
    }
  });

  // All IDAT chunks share one zlib stream, including across tile boundaries.
  const reader = scanlines.pipeThrough(new CompressionStream('deflate')).getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(pngChunk('IDAT', value));
    }
  } finally {
    reader.releaseLock();
  }
  chunks.push(pngChunk('IEND'));
  return new Blob(chunks, { type: 'image/png' });
}
