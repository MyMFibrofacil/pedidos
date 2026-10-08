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
    ["createClientContext", "src/config/client.js"],
    ["createAppState", "src/state/create-app-state.js"],
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
