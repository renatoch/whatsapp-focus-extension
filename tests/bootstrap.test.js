const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('manifest factories load without DOM access and bootstrap enters blind state before body exists', () => {
  const classes = new Set();
  let domReads = 0;
  const rootNode = { classList: {
    add: (...values) => values.forEach((value) => classes.add(value)),
    remove: (...values) => values.forEach((value) => classes.delete(value)),
    contains: (value) => classes.has(value),
  } };
  const document = {
    get body() { domReads++; return null; },
    get documentElement() { domReads++; return rootNode; },
    addEventListener() {}, getElementById: () => null,
    querySelectorAll: () => [], querySelector: () => null,
  };
  const context = vm.createContext({ document, console,
    window: { setInterval() {}, setTimeout() {}, clearTimeout() {}, clearInterval() {} },
    MutationObserver: class { observe() {} disconnect() {} },
  });
  const scripts = manifest.content_scripts[0].js;
  assert.equal(scripts.at(-1), 'content.js');
  for (const file of scripts.slice(0, -1)) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  assert.equal(domReads, 0);
  vm.runInContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), context, { filename: 'content.js' });
  assert.ok(classes.has('mwf-active')); assert.ok(classes.has('mwf-overlay-open'));
  assert.equal(manifest.content_scripts[0].run_at, 'document_start');
});
