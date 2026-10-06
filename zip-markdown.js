(function exposeZipMarkdown(scope) {
  'use strict';
  const MAX_ZIP = 64 * 1024 * 1024;
  const MAX_MARKDOWN = 16 * 1024 * 1024;
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function outputName(name) {
    const stem = String(name).replace(/\.zip$/i, '').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_').replace(/[. ]+$/g, '').slice(0, 180);
    return `${stem || 'Conversa'}.md`;
  }
  async function inflateRaw(bytes, limit) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = []; let size = 0;
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) throw new Error('Markdown excede o limite permitido.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const result = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }
  async function extractMarkdown(input, name, inflate = inflateRaw) {
    const bytes = new Uint8Array(input);
    if (bytes.length > MAX_ZIP) throw new Error('ZIP maior que 64 MB.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const invalid = () => { throw new Error('ZIP inválido ou formato não suportado.'); };
    const range = (offset, size) => { if (offset < 0 || size < 0 || offset + size > bytes.length) invalid(); };
    const u16 = offset => { range(offset, 2); return view.getUint16(offset, true); };
    const u32 = offset => { range(offset, 4); return view.getUint32(offset, true); };
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) { end = i; break; }
    }
    if (end < 0) invalid();
    const count = u16(end + 10), directorySize = u32(end + 12), directoryOffset = u32(end + 16);
    if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count > 2048 || count === 65535 || directoryOffset + directorySize !== end) invalid();
    let cursor = directoryOffset; const matches = [];
    for (let index = 0; index < count; index++) {
      range(cursor, 46);
      if (u32(cursor) !== 0x02014b50) invalid();
      const length = u16(cursor + 28), extra = u16(cursor + 30), comment = u16(cursor + 32);
      range(cursor + 46, length + extra + comment);
      if (u16(cursor + 34)) invalid();
      const filename = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + length));
      if (filename.split(/[\\/]/).at(-1) === 'chat.md') {
        matches.push({flags:u16(cursor+8), method:u16(cursor+10), crc:u32(cursor+16), compressed:u32(cursor+20),
          size:u32(cursor+24), offset:u32(cursor+42), rawName:bytes.slice(cursor+46,cursor+46+length)});
      }
      cursor += 46 + length + extra + comment;
      if (cursor > end) invalid();
    }
    if (cursor !== end) invalid();
    if (!matches.length) throw new Error('Não foi encontrado chat.md no ZIP.');
    if (matches.length !== 1) throw new Error('ZIP contém mais de um chat.md; não é possível escolher com segurança.');
    const item = matches[0];
    if (item.flags & (1 | 64) || ![0,8].includes(item.method)) throw new Error('ZIP criptografado ou compressão não suportada.');
    if (item.size > MAX_MARKDOWN || item.compressed > MAX_ZIP) throw new Error('Markdown maior que 16 MB.');
    range(item.offset,30);
    if (u32(item.offset) !== 0x04034b50 || u16(item.offset+6) !== item.flags || u16(item.offset+8) !== item.method) invalid();
    const localLength = u16(item.offset+26), localExtra = u16(item.offset+28);
    const start = item.offset + 30 + localLength + localExtra;
    range(item.offset+30,localLength+localExtra);
    const localName = bytes.subarray(item.offset+30,item.offset+30+localLength);
    if (localLength !== item.rawName.length || localName.some((byte,index)=>byte!==item.rawName[index]) || start + item.compressed > directoryOffset) invalid();
    const compressed = bytes.subarray(start,start+item.compressed);
    let result;
    try { result = item.method === 0 ? compressed.slice() : await inflate(compressed, item.size); }
    catch (_) { throw new Error('Não foi possível descompactar o Markdown.'); }
    if (result.length !== item.size || crc32(result) !== item.crc) throw new Error('Markdown corrompido: tamanho ou integridade inválidos.');
    return {bytes:result, name:outputName(name)};
  }
  const api = Object.freeze({extractMarkdown, outputName, crc32, MAX_ZIP});
  scope.MirrorZipMarkdown = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
