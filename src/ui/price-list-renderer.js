/** Presenta productos agrupados por categoría y su selector de cantidades. */
(() => {
  function createPriceListRenderer(dependencies) {
    const {
      html, clientConfig, letterState, escapeHtml, renderValueProductRow,
      renderQuickStepButtons, getRenderState,
    } = dependencies;
    let searchTerm = '';
    let activeCategoryId = '';
    let kitGroupOpenState = {};
  function renderPriceListSection(section) {
    const filteredProducts = section.products.filter((product) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        String(product.material || "").toLowerCase().includes(term)
      );
    });
  
    if (filteredProducts.length === 0) {
      html.families.innerHTML = "";
      html.empty.classList.remove("hidden");
      return;
    }
  
    const selectedCategory = activeCategoryId
      ? (section.categories || []).find((category) => category.id === activeCategoryId)
      : null;
    const categories = selectedCategory ? [selectedCategory] : Array.isArray(section.categories) ? section.categories : [];
    const categoryMarkup = categories.length
      ? categories
          .map((category) => {
            const matchingProducts = category.products.filter((product) => filteredProducts.includes(product));
            if (!matchingProducts.length) return "";
            const open = searchTerm || Boolean(kitGroupOpenState[category.id]);
            return `
              <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  data-kit-group-toggle="${escapeHtml(category.id)}"
                  class="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-extrabold text-slate-800">${escapeHtml(category.name)}</p>
                    <p class="mt-1 text-xs text-slate-500">${matchingProducts.length} productos</p>
                  </div>
                  <span class="material-symbols-outlined text-slate-500 transition-transform ${open ? "rotate-180" : ""}">expand_more</span>
                </button>
                ${
                  open
                    ? `<div class="divide-y divide-slate-100 border-t border-slate-100">${matchingProducts
                        .map((product) => renderValueProductRow(product, product.model || ""))
                        .join("")}</div>`
                    : ""
                }
              </article>
            `;
          })
          .join("")
      : `<div class="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
          ${filteredProducts.map((product) => renderValueProductRow(product)).join("")}
        </div>`;
  
    html.families.innerHTML = `
      <section class="space-y-3">
        ${clientConfig?.orderClearOnly ? `<button type="button" data-order-clear class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700">Limpiar pedido</button>` : `<div class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Categoria</p>
              <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(selectedCategory?.name || section.name)}</p>
            </div>
            ${clientConfig?.hideQuantitySteps ? "" : `<p class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Paso ${escapeHtml(letterState.step)}</p>`}
          </div>
          ${
            selectedCategory && clientConfig?.categoryHome
              ? `<button type="button" data-category-home class="flex items-center gap-1 text-sm font-bold text-primary"><span class="material-symbols-outlined text-base">arrow_back</span>Ver todas las categorías</button>`
              : ""
          }
          ${clientConfig?.hideQuantitySteps ? "" : `<div class="flex gap-2 overflow-x-auto scrollbar-hide">${renderQuickStepButtons()}</div>`}
          <button
            type="button"
            data-category-clear="active"
            class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            Limpiar categoria
          </button>
        </div>`}
        <div class="space-y-3">${categoryMarkup}</div>
      </section>
    `;
    html.empty.classList.add("hidden");
  }
    function render(section) {
      ({ searchTerm, activeCategoryId, kitGroupOpenState } = getRenderState());
      renderPriceListSection(section);
    }

    return render;
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createPriceListRenderer = createPriceListRenderer;
})();
