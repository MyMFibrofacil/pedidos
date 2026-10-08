/** Presenta las pestañas del catálogo y la selección de categorías. */
(() => {
  function createCatalogNavigationRenderer(dependencies) {
    const {
      html, clientConfig, escapeHtml, getAvailableSections, getCatalog,
      getNavigationState, onEmptyCategories,
    } = dependencies;
  function renderTabs() {
    const { categoryHomeOpen, activeThickness } = getNavigationState();
    const hideTabs = Boolean(clientConfig?.hideSingleSectionTab && !clientConfig?.categoryHome && getAvailableSections().length <= 1);
    html.tabs.classList.toggle("hidden", hideTabs);
    if (hideTabs) {
      html.tabs.innerHTML = "";
      return;
    }
    const categoryHomeTab = clientConfig?.categoryHome
      ? `
          <button
            data-category-home
            class="flex flex-col items-center min-w-[88px] justify-center border-b-[3px] ${
              categoryHomeOpen ? "border-primary text-primary" : "border-transparent text-slate-500"
            } gap-1 pb-2 pt-3"
          >
            <span class="material-symbols-outlined">category</span>
            <p class="text-xs ${categoryHomeOpen ? "font-bold" : "font-medium"} whitespace-nowrap">Categorías</p>
          </button>
        `
      : "";
  
    html.tabs.innerHTML = categoryHomeTab + getAvailableSections()
      .map((section) => {
        const active = !categoryHomeOpen && section.id === activeThickness;
        const tabLabel = clientConfig?.sectionLabels?.[section.id] || section.name;
        return `
          <button
            data-thickness="${escapeHtml(section.id)}"
            class="flex flex-col items-center min-w-[88px] justify-center border-b-[3px] ${
              active ? "border-primary text-primary" : "border-transparent text-slate-500"
            } gap-1 pb-2 pt-3"
          >
            <span class="material-symbols-outlined">${escapeHtml(section.icon)}</span>
            <p class="text-xs ${active ? "font-bold" : "font-medium"} whitespace-nowrap">${escapeHtml(tabLabel)}</p>
          </button>
        `;
      })
      .join("");
  }
  
  function getCatalogCategories() {
    return getCatalog().flatMap((section) =>
      (section.categories || []).map((category) => ({
        ...category,
        sectionId: section.id,
        sectionName: section.name,
      }))
    );
  }
  
  function renderCategoryHome(searchTerm) {
    const categories = getCatalogCategories();
    if (!categories.length) {
      onEmptyCategories();
      return;
    }
  
    const term = searchTerm.toLowerCase();
    const filteredCategories = !term
      ? categories
      : categories.filter((category) =>
          category.name.toLowerCase().includes(term) ||
          category.sectionName.toLowerCase().includes(term) ||
          category.products.some((product) =>
            `${product.name} ${product.model || ""}`.toLowerCase().includes(term)
          )
        );
  
    html.families.innerHTML = filteredCategories.length
      ? `
        <section class="space-y-3">
          <div class="px-1">
            <h1 class="text-lg font-extrabold text-slate-900">Categorías</h1>
            <p class="mt-1 text-sm text-slate-500">Elegí una categoría para ver sus productos.</p>
          </div>
          <div class="space-y-3">
            ${filteredCategories
              .map(
                (category) => `
                  <button
                    type="button"
                    data-category-select="${escapeHtml(category.id)}"
                    data-category-section="${escapeHtml(category.sectionId)}"
                    class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition active:scale-[0.99]"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-extrabold text-slate-800">${escapeHtml(category.name)}</p>
                      <p class="mt-1 text-xs text-slate-500">${escapeHtml(category.sectionName)} · ${category.products.length} productos</p>
                    </div>
                    <span class="material-symbols-outlined shrink-0 text-primary">chevron_right</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </section>
      `
      : "";
    html.empty.classList.toggle("hidden", filteredCategories.length > 0);
  }
    return {
      renderTabs,
      renderCategoryHome,
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createCatalogNavigationRenderer = createCatalogNavigationRenderer;
})();
