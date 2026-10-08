/** Adapta la hoja del formato moreira-categories al modelo común de catálogo. */
(() => {
  function createCatalog(sourceData, dependencies) {
    const { normalizePrice, lettersConfig, letterState, slugify, compareText, groupProductsBy } = dependencies;
    const categoriesData = sourceData;
    const rows = categoriesData?.table?.rows || [];

    const letterPriceRow = rows.find((row) => String(row?.c?.[11]?.v || "").trim() === lettersConfig.priceRowLabel);
    if (letterPriceRow) {
      lettersConfig.sizes.forEach((size, index) => {
        const rawValue = letterPriceRow.c?.[index + 12]?.v;
        letterState.prices[size] = normalizePrice(rawValue);
      });
    }

    const kitsMap = new Map();
    const individuals = [];

    rows.forEach((row, rowIndex) => {
      const cells = row.c || [];

      const kitFullName = String(cells[0]?.v || "").trim();
      const kitName = String(cells[1]?.v || "").trim();
      const kitMaterial = String(cells[2]?.v || "").trim();
      const kitObject = String(cells[3]?.v || "").trim();
      const kitPrice = Number(cells[4]?.v);

      if (kitFullName && kitName && kitMaterial && kitObject && Number.isFinite(kitPrice)) {
        const familyId = `kit-${slugify(kitName)}`;
        if (!kitsMap.has(familyId)) {
          kitsMap.set(familyId, {
            id: familyId,
            name: kitName,
            type: "kit",
            open: false,
            products: [],
            materialGroups: [],
            sortIndex: rowIndex,
            basePrice: 0,
          });
        }

        const family = kitsMap.get(familyId);
        family.products.push({
          id: `prd-${familyId}-${slugify(kitFullName)}-${rowIndex}`,
          name: kitFullName,
          material: kitMaterial,
          object: kitObject,
          unitPrice: kitPrice,
          sortIndex: rowIndex,
        });
        family.basePrice += kitPrice;
      }

      const individualFullName = String(cells[6]?.v || "").trim();
      const individualObject = String(cells[7]?.v || "").trim();
      const individualMaterial = String(cells[8]?.v || "").trim();
      const individualPrice = Number(cells[9]?.v);

      if (individualFullName && individualMaterial && Number.isFinite(individualPrice)) {
        individuals.push({
          id: `prd-individual-${slugify(individualFullName)}-${rowIndex}`,
          name: individualFullName,
          object: individualObject,
          material: individualMaterial,
          unitPrice: individualPrice,
          sortIndex: rowIndex,
        });
      }
    });

    return [
      {
        id: "kits",
        name: "Kits",
        summaryLabel: "Kits",
        icon: "deployed_code",
        type: "kits",
        families: Array.from(kitsMap.values())
          .map((family) => ({
            ...family,
            products: family.products.sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
            materialGroups: groupProductsBy(family.products, "material", compareText).map((group) => ({
              id: `mat-${family.id}-${slugify(group.label)}`,
              name: group.label,
              basePrice: group.items.reduce((sum, item) => sum + item.unitPrice, 0),
              products: group.items.sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
            })),
          }))
          .sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
      },
      {
        id: "individuales",
        name: "Individuales",
        summaryLabel: "Individuales",
        icon: "inventory_2",
        type: "price-list",
        families: [],
        products: individuals.sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)),
      },
      {
        id: "letras",
        name: "Letras",
        summaryLabel: "Letras",
        icon: "title",
        type: "letters",
        families: [],
        products: [],
      },
    ].filter(
      (section) =>
        section.type === "letters" ||
        section.families?.length > 0 ||
        section.products?.length > 0
    );
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.catalogAdapters = window.PedidosApp.catalogAdapters || {};
  window.PedidosApp.catalogAdapters["moreira-categories"] = { createCatalog };
})();
