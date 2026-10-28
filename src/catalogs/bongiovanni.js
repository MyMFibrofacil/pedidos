/** Interpreta las tandas de Bongiovanni y conserva todo su contenido. */
(() => {
  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sin-nombre";
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

  /** Agrupa dinámicamente por los nombres de sección y categoría de la hoja. */
  function createCatalog(data) {
    const table = data?.table;
    const columns = table?.cols || [];
    const indexes = Object.fromEntries(columns.map((column, index) => [normalizeHeader(column.label), index]));
    for (const label of ["producto", "salen", "tanda", "$ unitario"]) {
      if (indexes[label] === undefined) throw new Error(`Bongiovanni: falta la columna ${label}.`);
    }
    const hasSectionColumn = indexes["sección"] !== undefined;
    const hasCategoryColumn = indexes["categoría"] !== undefined;
    const sections = new Map();
    const getOrCreateSection = (name, sortIndex) => {
      const key = normalizeHeader(name);
      if (!sections.has(key)) {
        const id = `section-${slugify(name)}`;
        sections.set(key, {
          id, name, summaryLabel: name, icon: "inventory_2", type: "price-list",
          families: [], products: [], categories: [], categoriesMap: new Map(), sortIndex,
        });
      }
      return sections.get(key);
    };
    const getOrCreateCategory = (section, name, sortIndex) => {
      const key = normalizeHeader(name);
      if (!section.categoriesMap.has(key)) {
        section.categoriesMap.set(key, {
          id: `${section.id}-category-${slugify(name)}`,
          name, products: [], sortIndex,
        });
      }
      return section.categoriesMap.get(key);
    };
    let currentProduct;
    (table.rows || []).forEach((row, rowIndex) => {
      const cells = row.c || [];
      const cell = (label) => cells[indexes[label]]?.v ?? "";
      const name = String(cell("producto")).trim();
      const outputName = String(cell("salen")).trim();
      const sectionName = String(cell("sección")).trim();
      const categoryName = String(cell("categoría")).trim();
      if (!name && !outputName) return;
      const rowNumber = rowIndex + 2;
      if (name) {
        const selectedSection = sectionName || (hasSectionColumn ? "" : "Tandas");
        const selectedCategoryName = categoryName || (hasCategoryColumn ? "" : "Otros");
        if (!selectedSection) throw new Error(`Bongiovanni: falta Sección en la fila ${rowNumber}.`);
        if (!selectedCategoryName) throw new Error(`Bongiovanni: falta Categoría en la fila ${rowNumber}.`);
        const section = getOrCreateSection(selectedSection, rowIndex);
        const selectedCategory = getOrCreateCategory(section, selectedCategoryName, rowIndex);
        currentProduct = {
          id: `bongiovanni-${rowIndex}`,
          name,
          sectionId: section.id,
          categoryId: selectedCategory.id,
          unitPrice: 0,
          deliveryItems: [],
        };
        section.products.push(currentProduct);
        selectedCategory.products.push(currentProduct);
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
    return Array.from(sections.values())
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((section) => {
        const { categoriesMap, ...result } = section;
        return {
          ...result,
          categories: Array.from(categoriesMap.values()).sort((a, b) => a.sortIndex - b.sortIndex),
        };
      });
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
