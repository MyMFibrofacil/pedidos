/** Inicia la pantalla del cliente con configuración, estado y DOM compartidos. */
(() => {
  function startApp() {
    const api = window.PedidosApp || {};
    if (!api.createClientContext || !api.createAppState || !api.getDomElements || !api.createAppController) {
      console.error("No se pudo iniciar Pedidos: falta un módulo de la aplicación.");
      return;
    }
    const context = api.createClientContext();
    if (!context.clientConfig) {
      console.error("No se pudo iniciar Pedidos: falta la configuración del cliente.");
      return;
    }
    const state = api.createAppState(context.thicknessMeta, context.lettersConfig);
    const html = api.getDomElements();
    api.createAppController({ ...context, state, html }).init();
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.startApp = startApp;
})();
