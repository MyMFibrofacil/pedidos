/** Agrupa productos por una propiedad y ordena los grupos por etiqueta. */
(() => {
  function groupProductsBy(products, key, compareText) {
    const groups = new Map();
    products.forEach((product) => {
      const value = String(product[key] || "").trim();
      if (!value) return;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(product);
    });
    return Array.from(groups.entries())
      .sort((a, b) => compareText(a[0], b[0]))
      .map(([label, items]) => ({ label, items }));
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.groupProductsBy = groupProductsBy;
})();
