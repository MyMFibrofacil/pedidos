/** Compatibilidad para páginas antiguas que aún referencian controller.js. */
(() => {
  if (window.PedidosApp?.createAppController || document.readyState !== "loading") return;
  const base = new URL("./", document.currentScript.src);
  [
    "clients.js",
    "src/catalogs/bongiovanni.js",
    "src/data/google-sheets.js",
    "src/order/summary.js",
    "src/order/message.js",
    "src/order/xubio-order.js",
    "src/order/send-order.js",
    "src/utils/catalog-groups.js",
    "src/catalogs/adapters/moreira_categories.js",
    "src/catalogs/adapters/moreira_shared_price_list.js",
    "src/catalogs/adapters/categorized_price_list.js",
    "src/catalogs/family-metrics.js",
    "src/catalogs/create-catalog-loader.js",
    "src/ui/catalog-navigation-renderer.js",
    "src/ui/letters-section-renderer.js",
    "src/ui/price-list-renderer.js",
    "src/ui/catalog-family-renderer.js",
    "src/ui/order-summary-renderer.js",
    "src/ui/create-screen-feedback.js",
    "src/events/bind-app-events.js",
    "src/config/client.js",
    "src/state/create-app-state.js",
    "src/state/create-quantity-manager.js",
    "src/state/create-letters-manager.js",
    "src/ui/dom-elements.js",
    "src/controller/create-app-controller.js",
  ].forEach((path) => {
    document.write(`<script src="${new URL(path, base).href}"><\/script>`);
  });
})();
