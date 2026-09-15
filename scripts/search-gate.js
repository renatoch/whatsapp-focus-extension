(function exposeSearchGate(globalScope) {
  "use strict";
  function createSearchGate({ readText, isSearching, onState, scheduler, minimum = 3, delayMs = 1000 }) {
    let timer = null, pending = "", revealed = "", generation = 0, disposed = false;
    function reset() {
      generation += 1;
      scheduler.clearTimeout(timer);
      timer = null;
      pending = "";
      revealed = "";
    }
    function emit(text, tooShort, waiting, searching = true) {
      onState({ text, tooShort, waiting, searching });
    }
    function update(text = readText()) {
      if (disposed) return;
      if (!isSearching()) { reset(); emit("", false, false, false); return; }
      if (text.length < minimum) {
        reset(); pending = text; emit(text, true, false); return;
      }
      if (revealed) { emit(text, false, false); return; }
      if (text === pending && timer !== null) return;
      scheduler.clearTimeout(timer);
      const token = ++generation;
      pending = text;
      emit(text, true, true);
      timer = scheduler.setTimeout(() => {
        if (disposed || token !== generation) return;
        if (!isSearching() || readText().length < minimum) { update(); return; }
        timer = null;
        revealed = readText();
        emit(revealed, false, false);
      }, delayMs);
    }
    function dispose() { reset(); disposed = true; }
    function start() { disposed = false; }
    return Object.freeze({ update, reset, dispose, start });
  }
  const api = Object.freeze({ createSearchGate });
  globalScope.MirrorSearchGate = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
