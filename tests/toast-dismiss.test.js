const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `Function ${name} must exist`);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}

test('toast includes close button and dismisses promptly without waiting for timeout', () => {
  const elements = [];
  function createElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      children: [],
      replaceChildren(...nodes) { this.children = nodes; },
      appendChild(node) { this.children.push(node); return node; },
      setAttribute(name, val) { this[name] = val; },
      addEventListener(type, handler) { this[`on_${type}`] = handler; },
      hidden: true,
      id: '',
      textContent: '',
      type: '',
    };
    elements.push(el);
    return el;
  }

  let toastEl = null;
  const document = {
    body: {
      appendChild(node) { toastEl = node; },
    },
    getElementById(id) {
      return id === 'mirror-whatsapp-focus-toast' ? toastEl : null;
    },
    createElement,
  };

  const timeouts = [];
  let cleared = [];
  const window = {
    setTimeout(fn, ms) {
      const id = timeouts.length + 1;
      timeouts.push({ id, fn, ms });
      return id;
    },
    clearTimeout(id) {
      cleared.push(id);
    },
  };

  const context = vm.createContext({
    document,
    window,
    TOAST_ID: 'mirror-whatsapp-focus-toast',
    copyDiagnostic: () => {},
  });

  const code = extract('hideToast') + '\n' + extract('showToast');
  vm.runInContext(code, context);

  // 1. Show diagnostic toast
  context.showToast('Erro de teste', { stage: 'failed' });
  assert.equal(toastEl.hidden, false);

  // Check buttons
  const buttons = elements.filter(el => el.tagName === 'BUTTON');
  const copyBtn = buttons.find(b => b.textContent === 'Copiar diagnóstico');
  const closeBtn = buttons.find(b => b.textContent === 'Fechar');

  assert.ok(copyBtn, 'Devem existir botão de copiar diagnóstico');
  assert.ok(closeBtn, 'Deve existir botão de fechar');

  // Trigger close button
  closeBtn.on_click();
  assert.equal(toastEl.hidden, true, 'Clicar em fechar deve ocultar o toast imediatamente');
  assert.ok(cleared.length > 0, 'Clicar em fechar deve cancelar o timeout ativo');
});

test('toast with diagnostic has reduced timeout (e.g. 10-12s instead of 30s)', () => {
  const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
  assert.doesNotMatch(content, /30000/);
});
