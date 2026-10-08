/** Adapta la hoja del formato moreira-shared-price-list al modelo común de catálogo. */
(() => {
  function createCatalog(sourceData, dependencies) {
    const { normalizeSheetLabel, normalizePrice, lettersConfig, letterState, slugify, compareText, groupProductsBy } = dependencies;
    const columns = sourceData?.table?.cols || [];
    const rows = sourceData?.table?.rows || [];
    const indexes = Object.fromEntries(
      columns.map((column, index) => [normalizeSheetLabel(column.label), index])
    );
    const getCell = (cells, label) => {
      const index = indexes[normalizeSheetLabel(label)];
      const value = index === undefined ? "" : cells[index]?.v;
      return value === null || value === undefined ? "" : value;
    };
    const normalizeMoreiraMaterial = (value) => {
      const normalized = normalizeSheetLabel(value).replace(/\s+/g, "");
      if (normalized === "3mm") return "MDF 3";
      if (normalized === "5mm") return "MDF 5";
      return String(value || "").trim();
    };
    const kitsMap = new Map();
    const individuals = [];

    rows.forEach((row, rowIndex) => {
      const cells = row.c || [];
      const section = normalizeSheetLabel(getCell(cells, "Sección"));
      const category = String(getCell(cells, "Categoría")).trim();
      const productName = String(getCell(cells, "Producto")).trim();
      const material = normalizeMoreiraMaterial(getCell(cells, "Material"));
      const unitPrice = normalizePrice(getCell(cells, "Precio"));

      if (!section || !productName || !Number.isFinite(unitPrice)) return;

      if (section === "letras") {
        const size = productName.match(/\b(22|27|33)\b/)?.[1];
        if (size && lettersConfig.sizes.includes(size)) letterState.prices[size] = unitPrice;
        return;
      }

      if (section === "kits" && category && material) {
        const kitName = /^kit\s/i.test(category) ? category : `Kit ${category}`;
        const familyId = `kit-${slugify(kitName)}`;
        if (!kitsMap.has(familyId)) {
          kitsMap.set(familyId, { id: familyId, name: kitName, type: "kit", open: false, products: [], materialGroups: [], sortIndex: rowIndex, basePrice: 0 });
        }
        const family = kitsMap.get(familyId);
        family.products.push({ id: `prd-${familyId}-${slugify(material)}-${slugify(productName)}-${rowIndex}`, name: `${kitName} ${material} ${productName}`, material, object: productName, unitPrice, sortIndex: rowIndex });
        family.basePrice += unitPrice;
        return;
      }

      if (section === "individuales" && material) {
        individuals.push({ id: `prd-individual-${slugify(productName)}-${slugify(material)}-${rowIndex}`, name: `${productName} ${material}`, object: productName, material, unitPrice, sortIndex: rowIndex });
      }
    });

    return [
      {
        id: "kits", name: "Kits", summaryLabel: "Kits", icon: "deployed_code", type: "kits",
        families: Array.from(kitsMap.values()).map((family) => ({
          ...family,
          products: family.products.sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
          materialGroups: groupProductsBy(family.products, "material", compareText).map((group) => ({
            id: `mat-${family.id}-${slugify(group.label)}`, name: group.label,
            basePrice: group.items.reduce((sum, item) => sum + item.unitPrice, 0),
            products: group.items.sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
          })),
        })).sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
      },
      { id: "individuales", name: "Individuales", summaryLabel: "Individuales", icon: "inventory_2", type: "price-list", families: [], products: individuals.sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)) },
      { id: "letras", name: "Letras", summaryLabel: "Letras", icon: "title", type: "letters", families: [], products: [] },
    ].filter((section) => section.type === "letters" || section.families?.length > 0 || section.products?.length > 0);
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.catalogAdapters = window.PedidosApp.catalogAdapters || {};
  window.PedidosApp.catalogAdapters["moreira-shared-price-list"] = { createCatalog };
})();
