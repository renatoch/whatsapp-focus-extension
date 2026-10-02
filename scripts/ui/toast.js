(function exposeToast(globalScope) {
  "use strict";

  function createToast({ document, scheduler, id, copyDiagnostic }) {
    let running = true, generation = 0, timer = null;
    const valid = token => running && token === generation;

    function cancelTimer() {
      if (timer !== null) scheduler.clearTimeout(timer);
      timer = null;
    }

    function hide() {
      if (!running) return;
      generation += 1;
      cancelTimer();
      const toast = document.getElementById(id);
      if (toast) toast.hidden = true;
    }

    function show(message, diagnostic = null) {
      if (!running || !document.body) return;
      const token = ++generation;
      cancelTimer();
      let toast = document.getElementById(id);
      if (!toast) {
        toast = document.createElement("div");
        toast.id = id;
        toast.setAttribute("role", "status");
        document.body.appendChild(toast);
      }
      toast.replaceChildren();
      const text = document.createElement("span");
      text.textContent = message;
      toast.appendChild(text);
      const actions = document.createElement("div");
      actions.className = "mwf-toast-actions";
      if (diagnostic) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Copiar diagnóstico";
        button.addEventListener("click", () => {
          if (valid(token)) copyDiagnostic(diagnostic, button);
        });
        actions.appendChild(button);
      }
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "mwf-toast-close";
      closeButton.textContent = "Fechar";
      closeButton.addEventListener("click", () => { if (valid(token)) hide(); });
      actions.appendChild(closeButton);
      toast.appendChild(actions);
      toast.hidden = false;
      timer = scheduler.setTimeout(() => { if (valid(token)) hide(); }, diagnostic ? 10000 : 5000);
    }

    function dispose() {
      if (!running) return;
      hide();
      running = false;
    }

    function start() { running = true; }

    return Object.freeze({ show, hide, dispose, start });
  }

  const api = Object.freeze({ createToast });
  globalScope.MirrorToast = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
