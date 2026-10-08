/** Adapta la hoja del formato categorized-price-list al modelo común de catálogo. */
(() => {
  function createCatalog(sourceData, dependencies) {
    const { normalizeSheetLabel, slugify } = dependencies;
    const columns = sourceData?.table?.cols || [];
    const sourceRows = sourceData?.table?.rows || [];
    const indexes = Object.fromEntries(
      columns.map((column, index) => [normalizeSheetLabel(column.label), index])
    );
    const getCell = (cells, label) => {
      const index = indexes[normalizeSheetLabel(label)];
      const value = index === undefined ? "" : cells[index]?.v;
      return value === null || value === undefined ? "" : value;
    };
    const sections = new Map();

    sourceRows.forEach((row, rowIndex) => {
      const cells = row.c || [];
      const sectionName = String(getCell(cells, "Sección")).trim();
      const categoryName = String(getCell(cells, "Categoría")).trim();
      const productName = String(getCell(cells, "Producto")).trim();
      const model = String(getCell(cells, "Modelo")).trim();
      const unitPrice = Number(getCell(cells, "Precio"));
      const active = String(getCell(cells, "Activo")).trim().toLowerCase();

      if (!sectionName || !productName || !Number.isFinite(unitPrice) || ["no", "false", "0"].includes(active)) {
        return;
      }

      const sectionId = `section-${slugify(sectionName)}`;
      if (!sections.has(sectionId)) {
        sections.set(sectionId, {
          id: sectionId,
          name: sectionName,
          summaryLabel: sectionName,
          icon: sectionName.toLowerCase().includes("letra") ? "title" : "inventory_2",
          type: "price-list",
          families: [],
          products: [],
          categoriesMap: new Map(),
          sortIndex: rowIndex,
        });
      }

      const section = sections.get(sectionId);
      const categoryLabel = categoryName || "Otros";
      const categoryId = `category-${sectionId}-${slugify(categoryLabel)}`;
      if (!section.categoriesMap.has(categoryId)) {
        section.categoriesMap.set(categoryId, {
          id: categoryId,
          name: categoryLabel,
          products: [],
          sortIndex: rowIndex,
        });
      }

      const product = {
        id: `prd-${sectionId}-${slugify(categoryLabel)}-${slugify(productName)}-${slugify(model)}-${rowIndex}`,
        name: productName,
        model,
        unitPrice,
        sortIndex: rowIndex,
      };
      section.products.push(product);
      section.categoriesMap.get(categoryId).products.push(product);
    });

    return Array.from(sections.values())
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((section) => ({
        ...section,
        products: section.products.sort((a, b) => a.sortIndex - b.sortIndex),
        categories: Array.from(section.categoriesMap.values())
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((category) => ({
            ...category,
            products: category.products.sort((a, b) => a.sortIndex - b.sortIndex),
          })),
      }));
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.catalogAdapters = window.PedidosApp.catalogAdapters || {};
  window.PedidosApp.catalogAdapters["categorized-price-list"] = { createCatalog };
})();
