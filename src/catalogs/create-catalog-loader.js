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
      return catalogAdapter.createCatalog(sourceData, {
        normalizePrice, normalizeSheetLabel, slugify, compareText, groupProductsBy,
        lettersConfig, letterState,
      });
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
