/** Interpreta las tandas de Bongiovanni y conserva todo su contenido. */
(() => {
  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseNumber(value, rowNumber, label) {
    const raw = typeof value === "number" ? value : String(value ?? "").trim();
    const number = typeof raw === "number"
      ? raw
      : Number(raw.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", "."));
    if (raw === "" || !Number.isFinite(number) || number < 0) {
      throw new Error(`Bongiovanni: ${label} inválido en la fila ${rowNumber}.`);
    }
    return number;
  }

  /** Devuelve una sección de productos; cada cantidad representa una tanda. */
  function createCatalog(data) {
    const table = data?.table;
    const columns = table?.cols || [];
    const indexes = Object.fromEntries(columns.map((column, index) => [normalizeHeader(column.label), index]));
    for (const label of ["producto", "salen", "tanda", "$ unitario"]) {
      if (indexes[label] === undefined) throw new Error(`Bongiovanni: falta la columna ${label}.`);
    }
    const products = [];
    let currentProduct;
    (table.rows || []).forEach((row, rowIndex) => {
      const cells = row.c || [];
      const cell = (label) => cells[indexes[label]]?.v ?? "";
      const name = String(cell("producto")).trim();
      const outputName = String(cell("salen")).trim();
      if (!name && !outputName) return;
      const rowNumber = rowIndex + 2;
      if (name) {
        currentProduct = {
          id: `bongiovanni-${rowIndex}`,
          name,
          unitPrice: 0,
          deliveryItems: [],
        };
        products.push(currentProduct);
      }
      if (!currentProduct || !outputName) {
        throw new Error(`Bongiovanni: producto o contenido de tanda faltante en la fila ${rowNumber}.`);
      }
      const quantity = parseNumber(cell("tanda"), rowNumber, "Tanda");
      const price = parseNumber(cell("$ unitario"), rowNumber, "$ Unitario");
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Bongiovanni: Tanda debe ser un entero positivo en la fila ${rowNumber}.`);
      }
      const subtotal = Math.round(quantity * price * 100) / 100;
      const rawTotal = cell("$ total");
      if (rawTotal !== "") {
        const listedTotal = parseNumber(rawTotal, rowNumber, "$ Total");
        if (Math.abs(listedTotal - subtotal) > 0.01) {
          throw new Error(`Bongiovanni: $ Total no coincide con Tanda × $ Unitario en la fila ${rowNumber}.`);
        }
      }
      currentProduct.deliveryItems.push({ name: outputName, quantity, unitPrice: price });
      currentProduct.unitPrice = Math.round((currentProduct.unitPrice + subtotal) * 100) / 100;
    });
    return products.length ? [{
      id: "tandas", name: "Tandas", summaryLabel: "Tandas", icon: "inventory_2",
      type: "price-list", families: [], products,
    }] : [];
  }

  function describeProduct(product) {
    return `Por tanda: ${product.deliveryItems.map((item) => `${item.quantity} ${item.name}`).join(" + ")}`;
  }

  function describeSelection(product, quantity) {
    return `${quantity} ${quantity === 1 ? "tanda" : "tandas"}: ${product.deliveryItems.map((item) => `${item.quantity * quantity} ${item.name}`).join(" + ")}`;
  }

  function buildOrderLines(product, quantity) {
    return [
      `- Tandas: ${quantity}`,
      ...product.deliveryItems.map((item) => `  - ${item.name}: ${item.quantity * quantity}`),
    ];
  }

  /** Expande las tandas a unidades reales para el presupuesto de Xubio. */
  function buildXubioItems(product, quantity) {
    if (quantity <= 0) return [];
    return product.deliveryItems.map((item) => ({
      descripcion: `${product.name} - ${item.name}`,
      cantidad: item.quantity * quantity,
      precio: item.unitPrice,
    }));
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.catalogAdapters = window.PedidosApp.catalogAdapters || {};
  window.PedidosApp.catalogAdapters["bongiovanni-batches"] = {
    createCatalog, describeProduct, describeSelection, buildOrderLines, buildXubioItems,
  };
})();
