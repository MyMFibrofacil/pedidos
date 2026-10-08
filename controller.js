/** Compatibilidad para páginas antiguas que aún referencian controller.js. */
(() => {
  if (window.PedidosApp?.createAppController || document.readyState !== "loading") return;
  const base = new URL("./", document.currentScript.src);
  [
    "src/data/google-sheets.js",
    "src/order/summary.js",
    "src/order/message.js",
    "src/order/xubio-order.js",
    "src/controller/create-app-controller.js",
  ].forEach((path) => {
    document.write(`<script src="${new URL(path, base).href}"><\/script>`);
  });
})();
