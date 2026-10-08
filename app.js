/** Punto de entrada compartido de las pantallas de pedidos. */
(() => {
  const api = window.PedidosApp || {};
  const start = () => {
    if (window.PedidosApp?.startApp) window.PedidosApp.startApp();
    else console.error("No se pudo iniciar Pedidos: falta el módulo de inicio.");
  };

  if (api.startApp) {
    start();
    return;
  }

  // Compatibilidad con páginas almacenadas en caché que todavía cargan app.js.
  if (document.readyState !== "loading") {
    console.error("No se pudo cargar el inicio de Pedidos fuera de la carga de la página.");
    return;
  }
  const base = new URL("./", document.currentScript.src);
  const modules = [
    ["loadSheetData", "src/data/google-sheets.js"],
    ["calculateOrderSummary", "src/order/summary.js"],
    ["formatOrderMessage", "src/order/message.js"],
    ["createXubioOrderData", "src/order/xubio-order.js"],
    ["createOrderSender", "src/order/send-order.js"],
    ["groupProductsBy", "src/utils/catalog-groups.js"],
    ["createCatalogLoader", "src/catalogs/create-catalog-loader.js"],
    ["createCatalogNavigationRenderer", "src/ui/catalog-navigation-renderer.js"],
    ["createLettersRenderer", "src/ui/letters-section-renderer.js"],
    ["createPriceListRenderer", "src/ui/price-list-renderer.js"],
    ["createCatalogFamilyRenderer", "src/ui/catalog-family-renderer.js"],
    ["renderOrderSummary", "src/ui/order-summary-renderer.js"],
    ["createScreenFeedback", "src/ui/create-screen-feedback.js"],
    ["bindAppEvents", "src/events/bind-app-events.js"],
    ["createAppController", "src/controller/create-app-controller.js"],
    ["createClientContext", "src/config/client.js"],
    ["createAppState", "src/state/create-app-state.js"],
    ["createQuantityManager", "src/state/create-quantity-manager.js"],
    ["createLettersManager", "src/state/create-letters-manager.js"],
    ["getDomElements", "src/ui/dom-elements.js"],
    ["startApp", "src/bootstrap/start-app.js"],
  ];
  modules.forEach(([name, path]) => {
    if (!window.PedidosApp?.[name]) {
      document.write(`<script src="${new URL(path, base).href}"><\/script>`);
    }
  });
  document.addEventListener("DOMContentLoaded", start, { once: true });
})();
