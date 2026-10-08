/** Prepara las unidades y precios del pedido para el presupuesto de Xubio. */
(() => {
function createXubioOrderData({ catalog, isLettersSection, lettersConfig, letterState, catalogAdapter, getProductQty, getFamilyQty, getMaterialQty, orderId }) {
  const items = [];
  const addItem = (description, quantity, price) => {
    const qty = Number(quantity);
    const unitPrice = Number(price);
    if (!description || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    items.push({
      descripcion: String(description).trim(),
      cantidad: qty,
      precio: unitPrice,
    });
  };

  catalog.forEach((section) => {
    if (isLettersSection(section.id)) {
      lettersConfig.letters.forEach((letter) => {
        lettersConfig.sizes.forEach((size) => {
          addItem(
            `${letter} ${size} mm - ${lettersConfig.materialLabel}`,
            letterState.quantities[letter]?.[size] || 0,
            letterState.prices[size] || 0
          );
        });
      });
      return;
    }

    if (section.type === "price-list") {
      section.products.forEach((product) => {
        if (catalogAdapter?.buildXubioItems) {
          catalogAdapter.buildXubioItems(product, getProductQty(product.id)).forEach((item) => {
            addItem(item.descripcion, item.cantidad, item.precio);
          });
          return;
        }
        const model = String(product.model || "").trim();
        addItem(
          [section.name, product.name, model].filter(Boolean).join(" - "),
          getProductQty(product.id),
          product.unitPrice
        );
      });
      return;
    }

    if (section.type === "kits") {
      section.families.forEach((family) => {
        addItem(`${family.name} - Kit completo`, getFamilyQty(family.id), family.basePrice);
        (family.materialGroups || []).forEach((group) => {
          addItem(`${family.name} - ${group.name}`, getMaterialQty(group.id), group.basePrice);
        });
        family.products.forEach((product) => {
          addItem(
            `${family.name} - ${product.material} - ${product.object}`,
            getProductQty(product.id),
            product.unitPrice
          );
        });
      });
    }
  });

  return {
    version: 1,
    orderId,
    currency: "ARS",
    items,
  };
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createXubioOrderData = createXubioOrderData;
})();
