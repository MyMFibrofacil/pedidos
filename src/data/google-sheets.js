/** Lee una pestaña de Google Sheets y devuelve su respuesta GViz. */
(() => {
  function parseSheetResponseText(rawText) {
    const match = rawText.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
    if (!match) throw new Error("Formato de respuesta de Google Sheets no reconocido");
    return JSON.parse(match[1]);
  }

  async function loadSheetData(clientConfig, gid) {
    if (!clientConfig?.sheetId || clientConfig.sheetGid === undefined) {
      return { table: { cols: [], rows: [] } };
    }
    const url = `https://docs.google.com/spreadsheets/d/${clientConfig.sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

    const loadWithFetch = async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`No se pudo leer la hoja (${response.status})`);
      return parseSheetResponseText(await response.text());
    };

    const loadWithScript = () => new Promise((resolve, reject) => {
      const previousGoogle = window.google;
      const previousSetResponse = window.google?.visualization?.Query?.setResponse;
      let settled = false;

      const cleanup = (scriptNode) => {
        if (scriptNode?.parentNode) scriptNode.parentNode.removeChild(scriptNode);
        if (window.google?.visualization?.Query) {
          window.google.visualization.Query.setResponse = previousSetResponse;
        }
      };

      window.google = window.google || {};
      window.google.visualization = window.google.visualization || {};
      window.google.visualization.Query = window.google.visualization.Query || {};
      window.google.visualization.Query.setResponse = (payload) => {
        if (settled) return;
        settled = true;
        cleanup(script);
        resolve(payload);
      };

      const script = document.createElement("script");
      script.src = `${url}&_ts=${Date.now()}`;
      script.async = true;
      script.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup(script);
        if (!previousGoogle) delete window.google;
        reject(new Error("No se pudo cargar la hoja por script"));
      };

      document.head.appendChild(script);
      setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup(script);
        if (!previousGoogle) delete window.google;
        reject(new Error("Tiempo de espera agotado al cargar la hoja"));
      }, 12000);
    });

    try {
      return await loadWithFetch();
    } catch (_error) {
      return loadWithScript();
    }
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.loadSheetData = loadSheetData;
})();
