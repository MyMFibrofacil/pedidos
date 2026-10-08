/** Compatibilidad con la pantalla antigua de Valeria; usa el inicio compartido. */
(() => {
  if (document.readyState !== "loading") return;
  const sharedEntry = new URL("../app.js", document.currentScript.src);
  document.write(`<script src="${sharedEntry.href}"><\/script>`);
})();
