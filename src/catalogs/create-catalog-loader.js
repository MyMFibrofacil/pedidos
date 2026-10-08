/** Convierte la hoja del cliente en secciones y productos normalizados. */
(() => {
  function createCatalogLoader(dependencies) {
    const {
      clientConfig, catalogAdapter, lettersConfig, letterState,
      normalizePrice, normalizeSheetLabel, slugify, compareText, groupProductsBy,
      getThicknessEntries, getSectionType, parseFamilyPlateVariant, isLettersSection,
    } = dependencies;

  async function loadCatalogFromSheet() {
    if (!clientConfig) {
      throw new Error("Cliente no configurado");
    }
  
    const loadSheetData = (gid) => window.PedidosApp.loadSheetData(clientConfig, gid);
  
    if (catalogAdapter?.createCatalog) {
      const sourceData = await loadSheetData(clientConfig.catalogSheetGid || clientConfig.sheetGid);
      return catalogAdapter.createCatalog(sourceData);
    }
  
    if (clientConfig?.catalogMode === "moreira-categories") {
      const categoriesData = await loadSheetData(clientConfig.catalogSheetGid || clientConfig.sheetGid);
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
  
    if (clientConfig?.catalogMode === "moreira-shared-price-list") {
      const sourceData = await loadSheetData(clientConfig.catalogSheetGid || clientConfig.sheetGid);
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
  
    if (clientConfig?.catalogMode === "categorized-price-list") {
      const sourceData = await loadSheetData(clientConfig.catalogSheetGid || clientConfig.sheetGid);
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
  
    const data = await loadSheetData(clientConfig.sheetGid);
    const cols = data?.table?.cols || [];
    const rows = data?.table?.rows || [];
    const indexes = Object.fromEntries(cols.map((col, index) => [col.label, index]));
    const normalizedIndexes = Object.fromEntries(
      cols.map((col, index) => [normalizeSheetLabel(col.label), index])
    );
  
    const getRaw = (cells, labelOrLabels) => {
      const labels = Array.isArray(labelOrLabels) ? labelOrLabels : [labelOrLabels];
      const index = labels.reduce((found, label) => {
        if (found !== undefined) return found;
        if (indexes[label] !== undefined) return indexes[label];
        return normalizedIndexes[normalizeSheetLabel(label)];
      }, undefined);
      if (index === undefined) return "";
      const cell = cells[index];
      if (!cell || cell.v === null || cell.v === undefined) return "";
      return cell.v;
    };
  
    const letterPriceRow = rows.find((row) => {
      const firstCell = row?.c?.[0];
      return String(firstCell?.v || "").trim() === lettersConfig.priceRowLabel;
    });
  
    if (letterPriceRow) {
      lettersConfig.sizes.forEach((size, index) => {
        const rawValue = letterPriceRow.c?.[index + 1]?.v;
        const numeric = Number(rawValue);
        letterState.prices[size] = Number.isFinite(numeric) ? numeric : 0;
      });
    }
  
    if (clientConfig?.catalogMode === "price-list") {
      const sections = [];
      const fixedSections = getThicknessEntries().map((meta) => ({
        id: meta.id,
        name: meta.label,
        summaryLabel: meta.summaryLabel || meta.label,
        icon: meta.icon,
        type: meta.type || "catalog",
        families: [],
        products: [],
      }));
  
      sections.push(...fixedSections);
  
      const materialsMap = new Map();
  
      rows.forEach((row, rowIndex) => {
        const cells = row.c || [];
        const productName = String(cells[7]?.v || "").trim();
        const material = String(cells[8]?.v || "").trim();
        const unitPrice = Number(cells[10]?.v);
  
        if (!productName || !material || !Number.isFinite(unitPrice)) {
          return;
        }
  
        const sectionId = `mat-${slugify(material)}`;
        if (!materialsMap.has(sectionId)) {
          materialsMap.set(sectionId, {
            id: sectionId,
            name: material,
            summaryLabel: material,
            icon: "inventory_2",
            type: "price-list",
            families: [],
            products: [],
          });
        }
  
        materialsMap.get(sectionId).products.push({
          id: `prd-${sectionId}-${slugify(productName)}-${rowIndex}`,
          name: productName,
          material,
          unitPrice,
          sortIndex: rowIndex,
        });
      });
  
      sections.push(
        ...Array.from(materialsMap.values())
          .map((section) => ({
            ...section,
            products: section.products.sort(
              (a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)
            ),
          }))
          .sort((a, b) => compareText(a.name, b.name))
      );
  
      return sections.filter((section) => section.type === "letters" || section.products.length > 0);
    }
  
    const sectionsMap = new Map(
      getThicknessEntries().map((meta) => [
        meta.id,
        {
          id: meta.id,
          name: meta.label,
          icon: meta.icon,
          type: getSectionType(meta.id),
          familiesMap: new Map(),
        },
      ])
    );
  
    rows.forEach((row, rowIndex) => {
      const cells = row.c || [];
      const rawFamilyName = String(getRaw(cells, "Familia") || "").trim();
      const productName = String(getRaw(cells, "Producto") || "").trim();
      const rawPlates = getRaw(cells, "placas");
      const thickness = String(getRaw(cells, "espesor") || "").trim();
      const type = slugify(getRaw(cells, "tipo"));
      const plates = Number(rawPlates);
      const explicitPlateLabel = String(
        getRaw(cells, ["placa", "placa_corte", "placa de corte", "medida_placa", "medida de placa"]) || ""
      )
        .trim()
        .replace(/\s+/g, "")
        .toLowerCase();
      const parsedFamilyVariant = parseFamilyPlateVariant(rawFamilyName);
      const familyName = parsedFamilyVariant.familyName || rawFamilyName;
      const plateLabel = explicitPlateLabel || parsedFamilyVariant.plateLabel;
  
      if (!rawFamilyName || !productName || !Number.isFinite(plates) || !sectionsMap.has(thickness)) {
        return;
      }
  
      if (isLettersSection(thickness)) {
        return;
      }
  
      const normalizedType = type === "individual" ? "individual" : "grupo";
      const section = sectionsMap.get(thickness);
      const normalizedFamilyName = normalizedType === "individual" ? "Individuales" : familyName;
      const familyId = `fam-${thickness}-${slugify(normalizedFamilyName)}`;
  
      if (!section.familiesMap.has(familyId)) {
        section.familiesMap.set(familyId, {
          id: familyId,
          name: normalizedFamilyName,
          type: normalizedType,
          open: false,
          products: [],
          variantsMap: new Map(),
          sortIndex: rowIndex,
        });
      }
  
      const family = section.familiesMap.get(familyId);
      const product = {
        id: `prd-${familyId}-${slugify(productName)}-${rowIndex}`,
        name: productName,
        plates,
        sourceFamily: rawFamilyName,
        plateLabel,
        sortIndex: rowIndex,
      };
  
      if (normalizedType === "grupo" && plateLabel) {
        const variantId = `var-${familyId}-${slugify(plateLabel)}`;
        if (!family.variantsMap.has(variantId)) {
          family.variantsMap.set(variantId, {
            id: variantId,
            plateLabel,
            products: [],
            sortIndex: rowIndex,
          });
        }
  
        family.variantsMap.get(variantId).products.push(product);
      }
  
      family.products.push(product);
    });
  
    return getThicknessEntries()
      .map((meta) => {
        const section = sectionsMap.get(meta.id);
        return {
          id: section.id,
          name: section.name,
          icon: section.icon,
          type: section.type,
          families: Array.from(section.familiesMap.values())
            .sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name))
            .map((family) => ({
              ...family,
              products: family.products.sort(
                (a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)
              ),
              variants: Array.from(family.variantsMap?.values() || [])
                .map((variant) => ({
                  ...variant,
                  products: variant.products.sort(
                    (a, b) => a.sortIndex - b.sortIndex || compareText(a.name, b.name)
                  ),
                }))
                .sort((a, b) => a.sortIndex - b.sortIndex || compareText(a.plateLabel, b.plateLabel)),
            })),
        };
      })
      .filter((section) => section.type === "letters" || section.families.length > 0);
  }
    return loadCatalogFromSheet;
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createCatalogLoader = createCatalogLoader;
})();
