/** Presenta tarjetas, kits, variantes y filas de productos del catálogo. */
(() => {
  function createCatalogFamilyRenderer(dependencies) {
    const {
      escapeHtml, slugify, compareText, formatCurrency, normalizePrice,
      getFamilyQty, getVariantQty, getProductQty, getMaterialQty,
      getFamilyProducts, getFamilyVariants, hasPlateVariants,
      getVariantBasePlates, getFamilyGroupTotalPlates, getSinglePlateReference, groupProductsBy,
      getProductDisplayName, getRenderState,
    } = dependencies;
    let searchTerm = '';
    let kitGroupOpenState = {};
    let catalogAdapter = null;

  function searchMatchesFamily(family) {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (family.name.toLowerCase().includes(term)) return true;
    if (getFamilyVariants(family).some((variant) => String(variant.plateLabel || "").toLowerCase().includes(term))) {
      return true;
    }
    return getFamilyProducts(family).some((product) => (
      product.name.toLowerCase().includes(term)
      || String(product.plateLabel || "").toLowerCase().includes(term)
      || String(product.material || "").toLowerCase().includes(term)
      || String(product.object || "").toLowerCase().includes(term)
    ));
  }

  function filteredProductsForFamily(family) {
    const products = getFamilyProducts(family);
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((product) => (
      family.name.toLowerCase().includes(term)
      || product.name.toLowerCase().includes(term)
      || String(product.plateLabel || "").toLowerCase().includes(term)
      || String(product.material || "").toLowerCase().includes(term)
      || String(product.object || "").toLowerCase().includes(term)
    ));
  }

  function filteredVariantsForFamily(family) {
    const variants = getFamilyVariants(family);
    if (!searchTerm) return variants;
    const term = searchTerm.toLowerCase();
    return variants.map((variant) => {
      const variantMatches = String(variant.plateLabel || "").toLowerCase().includes(term);
      const products = (variant.products || []).filter((product) => (
        family.name.toLowerCase().includes(term)
        || variantMatches
        || product.name.toLowerCase().includes(term)
        || String(product.material || "").toLowerCase().includes(term)
        || String(product.object || "").toLowerCase().includes(term)
      ));
      if (!variantMatches && !products.length && !family.name.toLowerCase().includes(term)) return null;
      return { ...variant, products: products.length > 0 ? products : variant.products };
    }).filter(Boolean);
  }

  function renderGroupFamilyDetails(family, products) {
    const familyQty = getFamilyQty(family.id);
    const familyBase = getFamilyProducts(family).reduce((total, product) => total + product.plates, 0);
  
    return `
      <div class="px-4 pb-4 space-y-3">
        <div class="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Placas por familia</p>
          <p class="text-sm font-semibold text-slate-800">${familyBase} placas</p>
          ${
            familyQty > 0
              ? `<p class="text-xs text-primary font-semibold mt-1">Pedido actual: ${familyBase * familyQty} placas</p>`
              : ""
          }
        </div>
        <div class="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
          ${products
            .map((product) => {
              const total = familyQty * product.plates;
              return `
                <div class="p-3 flex items-start justify-between gap-3 bg-white">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-800 break-words">${escapeHtml(product.name)}</p>
                    <p class="text-xs text-slate-500">Base: ${product.plates} placas</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm font-bold text-primary">${total > 0 ? `${total} placas` : "-"}</p>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }
  
  function renderVariantQtyControls(variant) {
    const qty = getVariantQty(variant.id);
  
    return `
      <div class="flex shrink-0 items-center bg-slate-100 rounded-lg p-1">
        <button
          data-variant-action="minus"
          data-variant="${escapeHtml(variant.id)}"
          class="size-8 flex items-center justify-center rounded-md bg-white shadow-sm text-primary"
          type="button"
        >
          <span class="material-symbols-outlined text-lg">remove</span>
        </button>
        <input
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          value="${qty}"
          data-variant-input="${escapeHtml(variant.id)}"
          class="w-12 h-8 text-center font-bold text-sm border-0 bg-transparent focus:ring-0 px-1"
        />
        <button
          data-variant-action="plus"
          data-variant="${escapeHtml(variant.id)}"
          class="size-8 flex items-center justify-center rounded-md ${
            qty > 0 ? "bg-primary text-white" : "bg-white text-primary"
          } shadow-sm"
          type="button"
        >
          <span class="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
    `;
  }
  
  function renderGroupFamilyPlateVariants(family) {
    const variants = filteredVariantsForFamily(family);
  
    return `
      <div class="px-4 pb-4 space-y-3">
        ${variants
          .map((variant) => {
            const qty = getVariantQty(variant.id);
            const basePlates = getVariantBasePlates(variant);
            const groupId = `plate-variant-${variant.id}`;
            const isOpen = searchTerm ? true : Boolean(kitGroupOpenState[groupId]);
  
            return `
              <section class="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div class="px-4 py-3 flex items-start justify-between gap-3 bg-slate-50">
                  <button
                    type="button"
                    data-kit-group-toggle="${escapeHtml(groupId)}"
                    class="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-slate-800">Placa ${escapeHtml(variant.plateLabel)}</p>
                      <p class="text-xs text-slate-500 mt-1">Cantidad pedida para esta placa</p>
                      ${
                        qty > 0
                          ? `<p class="text-xs text-primary font-semibold mt-1">${basePlates * qty} placas totales para esta variante</p>`
                          : ""
                      }
                    </div>
                    <span class="material-symbols-outlined text-slate-500 shrink-0">${isOpen ? "expand_less" : "expand_more"}</span>
                  </button>
                  ${renderVariantQtyControls(variant)}
                </div>
                ${
                  isOpen
                    ? `<div class="divide-y divide-slate-100">
                        ${variant.products
                          .map((product) => {
                            const total = product.plates * qty;
                            return `
                              <div class="p-3 flex items-start justify-between gap-3 bg-white">
                                <div class="min-w-0">
                                  <p class="text-sm font-semibold text-slate-800 break-words">${escapeHtml(product.name)}</p>
                                  <p class="text-xs text-slate-500">Base por 1 unidad: ${product.plates} placas</p>
                                </div>
                                <div class="text-right shrink-0">
                                  <p class="text-sm font-bold text-primary">${total > 0 ? `${total} placas` : "-"}</p>
                                  ${
                                    qty > 0
                                      ? `<p class="text-[11px] text-slate-500 mt-1">${product.plates} x ${qty}</p>`
                                      : ""
                                  }
                                </div>
                              </div>
                            `;
                          })
                          .join("")}
                      </div>`
                    : ""
                }
              </section>
            `;
          })
          .join("")}
      </div>
    `;
  }
  
  function renderIndividualProductRow(product) {
    const qty = getProductQty(product.id);
    const displayName = getProductDisplayName(product);
  
    return `
      <div class="p-4 flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold text-slate-800 break-words whitespace-normal leading-snug">${escapeHtml(displayName)}</h4>
        </div>
        <div class="flex shrink-0 items-center bg-slate-100 rounded-lg p-1">
          <button
            data-product-action="minus"
            data-product="${escapeHtml(product.id)}"
            class="size-8 flex items-center justify-center rounded-md bg-white shadow-sm text-primary"
          >
            <span class="material-symbols-outlined text-lg">remove</span>
          </button>
          <input
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            value="${qty}"
            data-product-input="${escapeHtml(product.id)}"
            class="w-12 h-8 text-center font-bold text-sm border-0 bg-transparent focus:ring-0 px-1"
          />
          <button
            data-product-action="plus"
            data-product="${escapeHtml(product.id)}"
            class="size-8 flex items-center justify-center rounded-md ${
              qty > 0 ? "bg-primary text-white" : "bg-white text-primary"
            } shadow-sm"
          >
            <span class="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </div>
    `;
  }
  
  function renderValueProductRow(product, metaLabel = "", displayName = "") {
    const qty = getProductQty(product.id);
    const subtotal = qty * normalizePrice(product.unitPrice);
    const title = displayName || product.name;
    const productDetails = catalogAdapter?.describeProduct?.(product) || metaLabel;
  
    return `
      <div class="p-4 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-800 break-words">${escapeHtml(title)}</p>
          ${
            productDetails
              ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(productDetails)}</p>`
              : ""
          }
          <p class="mt-1 text-xs text-slate-500">${escapeHtml(formatCurrency(product.unitPrice))}</p>
          ${
            subtotal > 0
              ? `<p class="mt-1 text-xs font-semibold text-primary">${escapeHtml(formatCurrency(subtotal))}</p>`
              : ""
          }
        </div>
        <div class="flex shrink-0 items-center bg-slate-100 rounded-lg p-1">
          <button
            data-product-action="minus"
            data-product="${escapeHtml(product.id)}"
            class="size-8 flex items-center justify-center rounded-md bg-white shadow-sm text-primary"
            type="button"
          >
            <span class="material-symbols-outlined text-lg">remove</span>
          </button>
          <input
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            value="${qty}"
            data-product-input="${escapeHtml(product.id)}"
            class="w-12 h-8 text-center font-bold text-sm border-0 bg-transparent focus:ring-0 px-1"
          />
          <button
            data-product-action="plus"
            data-product="${escapeHtml(product.id)}"
            class="size-8 flex items-center justify-center rounded-md ${
              qty > 0 ? "bg-primary text-white" : "bg-white text-primary"
            } shadow-sm"
            type="button"
          >
            <span class="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </div>
    `;
  }
  
  function renderKitGroupCard(
    family,
    title,
    items,
    field,
    groupLabel,
    contentRenderer = null,
    headerControls = "",
    priceLabel = ""
  ) {
    const groupId = `kit-group-${field}-${family.id}-${slugify(groupLabel)}`;
    const isOpen = searchTerm ? true : Boolean(kitGroupOpenState[groupId]);
    const detailLabel =
      field === "material"
        ? `${items.length} ${items.length === 1 ? "pieza" : "piezas"}`
        : `${items.length} ${items.length === 1 ? "opcion" : "opciones"}`;
  
    return `
      <section class="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div class="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50">
          <button
            type="button"
            data-kit-group-toggle="${escapeHtml(groupId)}"
            class="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(title)}</p>
                ${
                  priceLabel
                    ? `<p class="text-xs text-slate-500">${escapeHtml(priceLabel)}</p>`
                    : ""
                }
              </div>
              <p class="text-xs text-slate-500 mt-1">${escapeHtml(detailLabel)}</p>
            </div>
            <span class="material-symbols-outlined text-slate-500 shrink-0">${isOpen ? "expand_less" : "expand_more"}</span>
          </button>
          ${
            headerControls
              ? `<div class="shrink-0">${headerControls}</div>`
              : ""
          }
        </div>
        ${
          isOpen
            ? `<div class="divide-y divide-slate-100">
                ${items
                  .map((item) => {
                    if (contentRenderer) return contentRenderer(item);
                    const metaLabel = field === "material" ? item.object : item.material;
                    return renderValueProductRow(item, metaLabel);
                  })
                  .join("")}
              </div>`
            : ""
        }
      </section>
    `;
  }
  
  function renderKitFamilyDetails(family, products) {
    const productIds = new Set(products.map((product) => product.id));
    const visibleMaterialGroups = (family.materialGroups || []).filter((group) =>
      group.products.some((product) => productIds.has(product.id))
    );
  
    return `
      <div class="px-4 pb-4 space-y-3">
        ${visibleMaterialGroups
          .map((group) => {
            const materialQty = getMaterialQty(group.id);
            const controls = `
              <div class="flex shrink-0 items-center bg-slate-100 rounded-lg p-1">
                <button
                  data-material-action="minus"
                  data-material="${escapeHtml(group.id)}"
                  class="size-8 flex items-center justify-center rounded-md bg-white shadow-sm text-primary"
                  type="button"
                >
                  <span class="material-symbols-outlined text-lg">remove</span>
                </button>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  value="${materialQty}"
                  data-material-input="${escapeHtml(group.id)}"
                  class="w-12 h-8 text-center font-bold text-sm border-0 bg-transparent focus:ring-0 px-1"
                />
                <button
                  data-material-action="plus"
                  data-material="${escapeHtml(group.id)}"
                  class="size-8 flex items-center justify-center rounded-md ${
                    materialQty > 0 ? "bg-primary text-white" : "bg-white text-primary"
                  } shadow-sm"
                  type="button"
                >
                  <span class="material-symbols-outlined text-lg">add</span>
                </button>
              </div>
            `;
  
            return renderKitGroupCard(family, group.name, group.products, "material", group.name, (product) =>
              renderValueProductRow(product, "", product.object), controls, formatCurrency(group.basePrice)
            );
          })
          .join("")}
      </div>
    `;
  }
  
  function renderFamilyCard(family) {
    const filteredProducts = filteredProductsForFamily(family);
    if (searchTerm && filteredProducts.length === 0 && !searchMatchesFamily(family)) return "";
  
    if (family.type === "kit") {
      const isOpen = searchTerm ? true : family.open;
      const products = searchTerm ? filteredProducts : family.products;
      const familyQty = getFamilyQty(family.id);
      const materialsValue = (family.materialGroups || []).reduce(
        (sum, group) => sum + getMaterialQty(group.id) * group.basePrice,
        0
      );
      const extrasValue = family.products.reduce(
        (sum, product) => sum + getProductQty(product.id) * normalizePrice(product.unitPrice),
        0
      );
      const totalValue = familyQty * family.basePrice + materialsValue + extrasValue;
  
      return `
        <section class="rounded-xl overflow-hidden border border-slate-200 bg-white">
          <div class="p-4 flex items-start gap-3">
            <button
              data-family="${escapeHtml(family.id)}"
              class="flex-1 min-w-0 flex items-start gap-3 text-left"
              type="button"
            >
              <span class="material-symbols-outlined text-primary mt-0.5">${isOpen ? "folder_open" : "folder"}</span>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-bold text-slate-800">${escapeHtml(family.name)}</p>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  ${family.products.length} piezas - ${escapeHtml(formatCurrency(family.basePrice))} el kit
                </p>
                ${
                  totalValue > 0
                    ? `<p class="text-xs text-primary font-semibold mt-1">Pedido actual: ${escapeHtml(formatCurrency(totalValue))}</p>`
                    : ""
                }
              </div>
            </button>
            <div class="flex shrink-0 items-center bg-slate-100 rounded-lg p-1">
              <button
                data-family-action="minus"
                data-family-qty="${escapeHtml(family.id)}"
                class="size-8 flex items-center justify-center rounded-md bg-white shadow-sm text-primary"
                type="button"
              >
                <span class="material-symbols-outlined text-lg">remove</span>
              </button>
              <input
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                value="${familyQty}"
                data-family-input="${escapeHtml(family.id)}"
                class="w-12 h-8 text-center font-bold text-sm border-0 bg-transparent focus:ring-0 px-1"
              />
              <button
                data-family-action="plus"
                data-family-qty="${escapeHtml(family.id)}"
                class="size-8 flex items-center justify-center rounded-md ${
                  familyQty > 0 ? "bg-primary text-white" : "bg-white text-primary"
                } shadow-sm"
                type="button"
              >
                <span class="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          </div>
          ${isOpen ? renderKitFamilyDetails(family, products) : ""}
        </section>
      `;
    }
  
    if (hasPlateVariants(family)) {
      const isOpen = searchTerm ? true : family.open;
      const familyTotal = getFamilyGroupTotalPlates(family);
      const familyProducts = getFamilyProducts(family);
  
      return `
        <section class="rounded-xl overflow-hidden border border-slate-200 bg-white">
          <div class="p-4 flex items-start gap-3">
            <button
              data-family="${escapeHtml(family.id)}"
              class="flex-1 min-w-0 flex items-start gap-3 text-left"
              type="button"
            >
              <span class="material-symbols-outlined text-primary mt-0.5">${isOpen ? "folder_open" : "folder"}</span>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-bold text-slate-800">${escapeHtml(family.name)}</p>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  ${familyProducts.length} productos - ${getFamilyVariants(family).length} placas disponibles
                </p>
                ${
                  familyTotal > 0
                    ? `<p class="text-xs text-primary font-semibold mt-1">Pedido actual: ${familyTotal} placas</p>`
                    : ""
                }
              </div>
            </button>
          </div>
          ${isOpen ? renderGroupFamilyPlateVariants(family) : ""}
        </section>
      `;
    }
  
    const products = family.type === "grupo" && searchTerm ? getFamilyProducts(family) : filteredProducts;
    const isOpen = searchTerm ? true : family.open;
    const familyQty = getFamilyQty(family.id);
    const familyProducts = getFamilyProducts(family);
    const familyBase = familyProducts.reduce((total, product) => total + product.plates, 0);
    const plateReference = getSinglePlateReference(family);
    const familyTotal =
      family.type === "grupo"
        ? familyBase * familyQty
        : products.reduce((sum, product) => sum + getProductQty(product.id), 0);
  
    return `
      <section class="rounded-xl overflow-hidden border border-slate-200 bg-white">
        <div class="p-4 flex items-start gap-3">
          <button
            data-family="${escapeHtml(family.id)}"
            class="flex-1 min-w-0 flex items-start gap-3 text-left"
            type="button"
          >
            <span class="material-symbols-outlined text-primary mt-0.5">${isOpen ? "folder_open" : "folder"}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-bold text-slate-800">${escapeHtml(family.name)}</p>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                ${
                  family.type === "grupo"
                    ? `${familyProducts.length} productos - ${familyBase} placas por familia`
                    : `${familyProducts.length} producto${familyProducts.length === 1 ? "" : "s"}`
                }
              </p>
              ${
                plateReference
                  ? `<p class="text-xs text-slate-500 mt-1">Placa de referencia: ${escapeHtml(plateReference)}</p>`
                  : ""
              }
              ${
                familyTotal > 0
                  ? `<p class="text-xs text-primary font-semibold mt-1">Pedido actual: ${familyTotal} placas</p>`
                  : ""
              }
            </div>
          </button>
          ${
            family.type === "grupo"
              ? `
                <div class="flex shrink-0 items-center bg-slate-100 rounded-lg p-1">
                  <button
                    data-family-action="minus"
                    data-family-qty="${escapeHtml(family.id)}"
                    class="size-8 flex items-center justify-center rounded-md bg-white shadow-sm text-primary"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    value="${familyQty}"
                    data-family-input="${escapeHtml(family.id)}"
                    class="w-12 h-8 text-center font-bold text-sm border-0 bg-transparent focus:ring-0 px-1"
                  />
                  <button
                    data-family-action="plus"
                    data-family-qty="${escapeHtml(family.id)}"
                    class="size-8 flex items-center justify-center rounded-md ${
                      familyQty > 0 ? "bg-primary text-white" : "bg-white text-primary"
                    } shadow-sm"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              `
              : ""
          }
        </div>
        ${
          isOpen
            ? family.type === "grupo"
              ? renderGroupFamilyDetails(family, products)
              : `<div class="divide-y divide-slate-100">${products.map((product) => renderIndividualProductRow(product)).join("")}</div>`
            : ""
        }
      </section>
    `;
  }
    function withRenderState(callback, value, ...args) {
      ({ searchTerm, kitGroupOpenState, catalogAdapter } = getRenderState());
      return callback(value, ...args);
    }

    return {
      renderFamilyCard: (family) => withRenderState(renderFamilyCard, family),
      renderValueProductRow: (product, metaLabel = "", displayName = "") =>
        withRenderState(renderValueProductRow, product, metaLabel, displayName),
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createCatalogFamilyRenderer = createCatalogFamilyRenderer;
})();
