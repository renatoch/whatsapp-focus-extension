const test = require('node:test');
const assert = require('node:assert/strict');
const {deflateRawSync, inflateRawSync} = require('node:zlib');
const {extractMarkdown,outputName,crc32} = require('../zip-markdown.js');
function zip(entries) {
  const locals=[], directory=[]; let offset=0;
  for (const {name='chat.md',text='# Synthetic\r\nOlá',method=0,flags=0} of entries) {
    const filename=Buffer.from(name), data=Buffer.from(text), compressed=method===8?deflateRawSync(data):data;
    const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50);local.writeUInt16LE(flags,6);local.writeUInt16LE(method,8);
    local.writeUInt32LE(crc32(data),14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(flags,8);central.writeUInt16LE(method,10);
    central.writeUInt32LE(crc32(data),16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
    locals.push(local,filename,compressed);directory.push(central,filename);offset+=30+filename.length+compressed.length;
  }
  const cd=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,cd,end]);
}
const inflate=async bytes=>new Uint8Array(inflateRawSync(bytes));
test('extracts exact Markdown bytes only, using ZIP filename and preserving original buffer',async()=>{
  const input=zip([{},{name:'chat.txt',text:'ignored'},{name:'media.jpg',text:'ignored'}]),before=Buffer.from(input);
  const result=await extractMarkdown(input,'Conversa São João.zip');
  assert.equal(result.name,'Conversa São João.md');assert.equal(Buffer.from(result.bytes).toString(),'# Synthetic\r\nOlá');assert.deepEqual(input,before);
});
test('supports deflate with native stream and injected decoder; nested chat.md is not written to a path',async()=>{
  for(const decoder of [undefined,inflate]) {
    const result=await extractMarkdown(zip([{name:'folder/chat.md',method:8}]),'Example.ZIP',decoder);
    assert.equal(result.name,'Example.md');assert.equal(Buffer.from(result.bytes).toString(),'# Synthetic\r\nOlá');
  }
});
test('fails closed on missing or ambiguous Markdown',async()=>{
  await assert.rejects(extractMarkdown(zip([{name:'chat.txt'}]),'a.zip'),/Não foi encontrado/);
  await assert.rejects(extractMarkdown(zip([{}, {name:'other/chat.md'}]),'a.zip'),/mais de um/);
});
test('rejects corrupted data, truncation and encrypted or unsupported compression',async()=>{
  const corrupted=zip([{}]);corrupted[37]^=1;
  await assert.rejects(extractMarkdown(corrupted,'a.zip'),/corrompido/);
  await assert.rejects(extractMarkdown(zip([{}]).subarray(0,40),'a.zip'),/inválido/);
  for(const entry of [{flags:1},{method:99}])await assert.rejects(extractMarkdown(zip([entry]),'a.zip'),/não suportada/);
});
test('bounds advertised Markdown size before decompressing',async()=>{
  const input=zip([{method:8}]);const cd=input.readUInt32LE(input.length-6);input.writeUInt32LE(17*1024*1024,cd+24);
  let called=false;await assert.rejects(extractMarkdown(input,'a.zip',async()=>{called=true;}),/16 MB/);assert.equal(called,false);
});
test('supports data-descriptor flag while verifying central CRC and lengths',async()=>{
  const result=await extractMarkdown(zip([{method:8,flags:8}]),'a.zip',inflate);assert.equal(result.name,'a.md');
});
test('sanitizes output path and fallback names',()=>{
  assert.equal(outputName('../Example.zip'),'.._Example.md');assert.equal(outputName('.zip'),'Conversa.md');
  assert.equal(outputName('a:b?.zip'),'a_b_.md');
});
test('rejects arbitrary short inputs with controlled errors',async()=>{
  for(let length=0;length<80;length++)await assert.rejects(extractMarkdown(new Uint8Array(length),'a.zip'),/ZIP/);
});
module.exports={zip};
