/** Vista de Bongiovanni: productos desplegables con precios por unidad. */
(() => {
  const adapter = window.PedidosApp.catalogAdapters["bongiovanni-batches"];
  const createCatalog = adapter.createCatalog;
  const productsById = new Map();
  const expandedProducts = new Set();
  const currency = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", minimumFractionDigits: 2,
  });

  // Conserva el catálogo original y utiliza sus precios para la presentación.
  adapter.createCatalog = (data) => {
    const sections = createCatalog(data);
    productsById.clear();
    sections.forEach((section) => section.products.forEach((product) => productsById.set(product.id, product)));
    return sections;
  };

  function showUnitPrices() {
    document.querySelectorAll("[data-product-input]").forEach((input) => {
      const product = productsById.get(input.dataset.productInput);
      const row = input.parentElement.parentElement;
      if (!product || row.dataset.unitPricesShown) return;
      const details = row.firstElementChild;
      row.classList.add("producto-tanda");
      details.classList.add("detalle-tanda");
      input.parentElement.classList.add("cantidad-tanda");
      input.setAttribute("aria-label", `Tandas de ${product.name}`);
      const productName = details.querySelector("p:nth-of-type(1)");
      const batchContents = details.querySelector("p:nth-of-type(2)");
      const batchPrice = details.querySelector("p:nth-of-type(3)");
      batchContents.textContent = product.deliveryItems.map((item) => `${item.quantity} ${item.name}`).join(" + ");
      if (batchPrice) {
        batchPrice.textContent = `Total: ${currency.format(product.unitPrice)}`;
        batchPrice.className = "mt-2 text-sm font-bold text-primary";
      }
      const disclosure = document.createElement("details");
      disclosure.className = "group";
      disclosure.open = expandedProducts.has(product.id);
      const summary = document.createElement("summary");
      summary.className = "flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden";
      const heading = document.createElement("div");
      heading.className = "min-w-0";
      heading.append(productName, batchContents, batchPrice);
      const indicator = document.createElement("span");
      indicator.className = "material-symbols-outlined shrink-0 text-slate-500 transition-transform group-open:rotate-180";
      indicator.textContent = "expand_more";
      indicator.setAttribute("aria-hidden", "true");
      summary.append(heading, indicator);
      disclosure.appendChild(summary);
      const panel = document.createElement("div");
      panel.className = "precios-unitarios mt-2 space-y-1";
      const title = document.createElement("p");
      title.className = "text-xs font-semibold text-slate-600";
      title.textContent = "Precio individual por producto";
      panel.appendChild(title);
      product.deliveryItems.forEach((item) => {
        const line = document.createElement("p");
        line.className = "text-xs text-slate-600 break-words";
        line.textContent = `${item.name}: ${currency.format(item.unitPrice)} por unidad`;
        panel.appendChild(line);
      });
      disclosure.appendChild(panel);
      disclosure.addEventListener("toggle", () => {
        if (disclosure.open) expandedProducts.add(product.id);
        else expandedProducts.delete(product.id);
      });
      details.prepend(disclosure);
      row.dataset.unitPricesShown = "true";
    });
  }

  new MutationObserver(showUnitPrices).observe(document.getElementById("families-container"), { childList: true });
})();
