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

  /** Agrupa los productos por sección; cada cantidad representa una tanda. */
  function createCatalog(data, dependencies = {}) {
    const table = data?.table;
    const columns = table?.cols || [];
    const indexes = Object.fromEntries(columns.map((column, index) => [normalizeHeader(column.label), index]));
    for (const label of ["producto", "salen", "tanda", "$ unitario"]) {
      if (indexes[label] === undefined) throw new Error(`Bongiovanni: falta la columna ${label}.`);
    }
    const sectionNames = dependencies.sectionNames?.length
      ? dependencies.sectionNames
      : ["Muebles", "Herrajes"];
    const categoriesBySection = dependencies.categoriesBySection || {
      Muebles: ["Emi"],
      Herrajes: ["Tarugos", "Minifix"],
    };
    const sections = new Map(sectionNames.map((name) => {
      const id = `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      const categories = (categoriesBySection[name] || []).map((categoryName, sortIndex) => ({
        id: `${id}-category-${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        name: categoryName,
        products: [],
        sortIndex,
      }));
      return [id, { id, name, summaryLabel: name, icon: "inventory_2", type: "price-list", families: [], products: [], categories }];
    }));
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
        const selectedSection = sectionName || sectionNames[0];
        const sectionId = `section-${selectedSection.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
        const section = sections.get(sectionId);
        if (!section || section.name !== selectedSection) {
          throw new Error(`Bongiovanni: sección inválida en la fila ${rowNumber}.`);
        }
        const availableCategories = section.categories;
        const selectedCategoryName = categoryName || (availableCategories.length === 1 ? availableCategories[0].name : "");
        const selectedCategory = availableCategories.find((category) => category.name === selectedCategoryName);
        if (!selectedCategory) {
          const issue = selectedCategoryName ? "categoría no válida" : "falta Categoría";
          throw new Error(`Bongiovanni: ${issue} para la sección ${selectedSection} en la fila ${rowNumber}.`);
        }
        currentProduct = {
          id: `bongiovanni-${rowIndex}`,
          name,
          sectionId,
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
    return Array.from(sections.values());
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
