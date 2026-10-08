/** Calcula cantidades y valores de un pedido sin acceder al DOM. */
(() => {
function calculateOrderSummary({
  catalog, getAvailableSections, isLettersSection, summarizeLettersSection,
  getFamilyQty, getMaterialQty, getProductQty, getVariantQty,
  hasPlateVariants, getFamilyVariants, getFamilyProducts,
  getSinglePlateReference, getProductDisplayName, lettersConfig,
}) {
  const sections = [];
  let totalCount = 0;
  let totalValue = 0;
  const totalsByThickness = Object.fromEntries(
    getAvailableSections().map((meta) => [meta.id, 0])
  );
  const totalsByValue = Object.fromEntries(
    getAvailableSections().map((meta) => [meta.id, 0])
  );

  catalog.forEach((section) => {
    if (isLettersSection(section.id)) {
      const lettersSummary = summarizeLettersSection();
      if (lettersSummary.total > 0) {
        totalsByThickness[section.id] = lettersSummary.total;
        totalsByValue[section.id] = lettersSummary.subtotal;
        totalCount += lettersSummary.total;
        totalValue += lettersSummary.subtotal;
        sections.push({
          id: section.id,
          name: section.name,
          type: "letters",
          totalCount: lettersSummary.total,
          groupedBySize: lettersSummary.groupedBySize,
          sizeTotals: lettersSummary.sizeTotals,
          sizeSubtotals: lettersSummary.sizeSubtotals,
          subtotal: lettersSummary.subtotal,
          tax: lettersSummary.tax,
          totalWithTax: lettersSummary.totalWithTax,
          letters: lettersSummary.lines,
        });
      }
      return;
    }

    if (section.type === "kits") {
      const families = [];
      let sectionQuantity = 0;
      let sectionValue = 0;

      section.families.forEach((family) => {
        const fullKitQty = getFamilyQty(family.id);
        const selectedMaterials = (family.materialGroups || [])
          .map((group) => ({
            ...group,
            qty: getMaterialQty(group.id),
          }))
          .filter((group) => group.qty > 0);
        const selectedProducts = family.products
          .map((product) => ({
            ...product,
            qty: getProductQty(product.id),
          }))
          .filter((product) => product.qty > 0);

        if (fullKitQty <= 0 && selectedMaterials.length === 0 && selectedProducts.length === 0) return;

        const breakdown = [];
        if (fullKitQty > 0) {
          breakdown.push({
            kind: "full-kit",
            name: "Kit completo",
            qty: fullKitQty,
            subtotal: fullKitQty * family.basePrice,
          });
        }

        selectedMaterials.forEach((group) => {
          breakdown.push({
            kind: "material",
            name: group.name,
            qty: group.qty,
            subtotal: group.qty * group.basePrice,
          });
        });

        selectedProducts.forEach((product) => {
          breakdown.push({
            kind: "piece",
            name: `${product.material} - ${product.object}`,
            qty: product.qty,
            subtotal: product.qty * product.unitPrice,
          });
        });

        const familyQuantity =
          fullKitQty +
          selectedMaterials.reduce((sum, group) => sum + group.qty, 0) +
          selectedProducts.reduce((sum, product) => sum + product.qty, 0);
        const familyValue = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

        sectionQuantity += familyQuantity;
        sectionValue += familyValue;
        totalCount += familyQuantity;
        totalValue += familyValue;

        families.push({
          type: "kit",
          name: family.name,
          totalCount: familyQuantity,
          totalValue: familyValue,
          breakdown,
        });
      });

      if (families.length > 0) {
        totalsByThickness[section.id] = sectionQuantity;
        totalsByValue[section.id] = sectionValue;
        sections.push({
          id: section.id,
          name: section.name,
          type: "kits",
          totalCount: sectionQuantity,
          subtotal: sectionValue,
          families,
        });
      }
      return;
    }

    if (section.type === "price-list") {
      const selectedProducts = section.products
        .map((product) => ({
          ...product,
          qty: getProductQty(product.id),
        }))
        .filter((product) => product.qty > 0);

      if (selectedProducts.length === 0) return;

      const quantity = selectedProducts.reduce((sum, product) => sum + product.qty, 0);
      const subtotal = selectedProducts.reduce((sum, product) => sum + product.qty * product.unitPrice, 0);
      const tax = subtotal * lettersConfig.taxRate;
      const totalWithTax = subtotal + tax;

      totalsByThickness[section.id] = quantity;
      totalsByValue[section.id] = subtotal;
      totalCount += quantity;
      totalValue += subtotal;

      sections.push({
        id: section.id,
        name: section.name,
        type: "price-list",
        totalCount: quantity,
        subtotal,
        tax,
        totalWithTax,
        products: selectedProducts.map((product) => ({
          ...product,
          subtotal: product.qty * product.unitPrice,
        })),
      });
      return;
    }

    const families = [];
    let sectionTotal = 0;

    section.families.forEach((family) => {
      if (family.type === "grupo") {
        if (hasPlateVariants(family)) {
          const variants = getFamilyVariants(family)
            .map((variant) => {
              const qty = getVariantQty(variant.id);
              if (qty <= 0) return null;

              const breakdown = variant.products.map((product) => ({
                name: product.name,
                basePlates: product.plates,
                totalPlates: product.plates * qty,
              }));

              return {
                plateLabel: variant.plateLabel,
                multiplier: qty,
                totalPlates: breakdown.reduce((sum, item) => sum + item.totalPlates, 0),
                breakdown,
              };
            })
            .filter(Boolean);

          if (variants.length === 0) return;

          const familyTotal = variants.reduce((sum, variant) => sum + variant.totalPlates, 0);
          totalCount += familyTotal;
          sectionTotal += familyTotal;

          families.push({
            type: "grupo-placa",
            name: family.name,
            totalPlates: familyTotal,
            variants,
          });
          return;
        }

        const qty = getFamilyQty(family.id);
        if (qty <= 0) return;

        const breakdown = getFamilyProducts(family).map((product) => ({
          name: product.name,
          basePlates: product.plates,
          totalPlates: product.plates * qty,
        }));
        const familyTotal = breakdown.reduce((sum, item) => sum + item.totalPlates, 0);
        totalCount += familyTotal;
        sectionTotal += familyTotal;

        families.push({
          type: "grupo",
          name: family.name,
          plateReference: getSinglePlateReference(family),
          multiplier: qty,
          totalPlates: familyTotal,
          breakdown,
        });
        return;
      }

      const selectedProducts = family.products
        .map((product) => ({
          name: getProductDisplayName(product),
          sourceFamily: product.sourceFamily || family.name,
          qty: getProductQty(product.id),
        }))
        .filter((product) => product.qty > 0);

      if (selectedProducts.length === 0) return;

      const familyTotal = selectedProducts.reduce((sum, product) => sum + product.qty, 0);
      totalCount += familyTotal;
      sectionTotal += familyTotal;

      families.push({
        type: "individual",
        name: family.name,
        totalPlates: familyTotal,
        breakdown: selectedProducts.map((product) => ({
          name: product.name,
          totalPlates: product.qty,
        })),
      });
    });

    if (families.length > 0) {
      totalsByThickness[section.id] = sectionTotal;
      sections.push({
        id: section.id,
        name: section.name,
        type: "catalog",
        totalCount: sectionTotal,
        families,
      });
    }
  });

  return {
    sections,
    totalCount,
    totalValue,
    totalsByThickness,
    totalsByValue,
  };
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.calculateOrderSummary = calculateOrderSummary;
})();
