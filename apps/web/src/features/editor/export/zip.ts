// Standard in-memory PKZIP packager with Store (no compression)
// Fully compatible with Windows Explorer, macOS Archive Utility, 7-Zip, unzip

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const localHeaders: Uint8Array[] = [];

  for (const [filename, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(filename.replace(/\\/g, '/'));
    const contentBytes = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = calculateCrc32(contentBytes);
    const offset = currentOffset;

    // Local file header: 30 bytes + filename + data
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true); // General purpose bit flag (UTF-8)
    view.setUint16(8, 0, true); // Compression method (0 = Store)
    view.setUint16(10, 0, true); // File last mod time
    view.setUint16(12, 0, true); // File last mod date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    header.set(nameBytes, 30);

    localHeaders.push(header, contentBytes);
    fileEntries.push({ nameBytes, contentBytes, crc, offset });
    currentOffset += header.length + contentBytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  const centralHeaders: Uint8Array[] = [];

  for (const entry of fileEntries) {
    // Central directory header: 46 bytes + filename
    const header = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true); // Central dir signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0x0800, true); // UTF-8
    view.setUint16(10, 0, true); // Compression (Store)
    view.setUint16(12, 0, true); // Mod time
    view.setUint16(14, 0, true); // Mod date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    header.set(entry.nameBytes, 46);
    centralHeaders.push(header);
    currentOffset += header.length;
  }

  const centralDirectorySize = currentOffset - centralDirectoryOffset;

  // End of central directory record: 22 bytes
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where CD starts
  eocdView.setUint16(8, fileEntries.length, true); // Total entries on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total entries
  eocdView.setUint32(12, centralDirectorySize, true); // Size of CD
  eocdView.setUint32(16, centralDirectoryOffset, true); // Offset of CD
  eocdView.setUint16(20, 0, true); // Comment length

  const totalLength = currentOffset + eocd.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const chunk of [...localHeaders, ...centralHeaders, eocd]) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
}
