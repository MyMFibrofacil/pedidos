/** Coordina la interfaz, el catálogo y el pedido del cliente activo. */
(() => {
function createAppController({
  assetPrefix,
  clientConfig,
  clientKey,
  html,
  lettersConfig,
  state,
  summaryMode,
  thicknessMeta,
}) {
const textCollator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

let {
  activeThickness,
  catalog,
  emailSubmissionPending,
  pendingEmailStatusMessage,
  searchTerm,
  summaryOpen,
} = state;

const quantityManager = window.PedidosApp.createQuantityManager({
  state,
  normalizeQty,
  onChange: render,
});
const familyQuantities = quantityManager.quantities.family;
const kitGroupOpenState = state.kitGroupOpenState;
const letterState = state.letterState;
const materialQuantities = quantityManager.quantities.material;
const productQuantities = quantityManager.quantities.product;
const variantQuantities = quantityManager.quantities.variant;
const catalogAdapter = window.PedidosApp?.catalogAdapters?.[clientConfig?.catalogMode];
let currentOrderId = createOrderId();
let categoryHomeOpen = Boolean(clientConfig?.categoryHome);
let activeCategoryId = "";

function createOrderId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function compareText(a, b) {
  return textCollator.compare(String(a || ""), String(b || ""));
}

function normalizeQty(value) {
  const numeric = Number.parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
}

function getThicknessEntries() {
  return Object.values(thicknessMeta);
}

function getAvailableSections() {
  if (catalog.length > 0) return catalog;
  return getThicknessEntries().map((meta) => ({
    id: meta.id,
    name: meta.label,
    icon: meta.icon,
    type: meta.type || "catalog",
    families: [],
    products: [],
  }));
}

function getThickness(id) {
  return thicknessMeta[id] || {
    id,
    label: id,
    summaryLabel: id,
    messageLabel: id,
    summaryUnit: "placas",
    icon: "inventory_2",
    type: "catalog",
  };
}

function getSectionType(id) {
  const loadedSection = catalog.find((section) => section.id === id);
  if (loadedSection?.type) return loadedSection.type;
  return getThickness(id).type || "catalog";
}

function isLettersSection(id) {
  return getSectionType(id) === "letters";
}

function isPriceListSection(id) {
  return getSectionType(id) === "price-list";
}

function isKitSection(id) {
  return getSectionType(id) === "kits";
}

function getSectionUnitLabel(sectionId, count = 0) {
  const base = getThickness(sectionId).summaryUnit || "placas";
  if (base === "letras") return count === 1 ? "letra" : "letras";
  if (base === "items") return count === 1 ? "item" : "items";
  return count === 1 ? "placa" : "placas";
}

function formatSectionCount(sectionId, count) {
  return `${count} ${getSectionUnitLabel(sectionId, count)}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function normalizePrice(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

const screenFeedback = window.PedidosApp.createScreenFeedback({
  html,
  clientConfig,
  assetPrefix,
  escapeHtml,
});
const {
  applyClientUi,
  setFamiliesMessage,
  openDesignsModal,
  closeDesignsModal,
  setStatus,
  getRemainingScroll,
  hideScrollButton,
  showScrollButtonTemporarily,
} = screenFeedback;
function updateSearchVisibility() {
  screenFeedback.updateSearchVisibility(isLettersSection(activeThickness));
}

function getActiveThickness() {
  return catalog.find((section) => section.id === activeThickness);
}

const {
  getFamilyQty,
  getVariantQty,
  getProductQty,
  getMaterialQty,
  setFamilyQty,
  updateFamilyQty,
  setVariantQty,
  updateVariantQty,
  setProductQty,
  updateProductQty,
  setMaterialQty,
  updateMaterialQty,
} = quantityManager;

const familyMetrics = window.PedidosApp.createFamilyMetrics({ getFamilyQty, getVariantQty });
const {
  getFamilyProducts, getFamilyVariants, hasPlateVariants,
  getSinglePlateReference, getVariantBasePlates, getFamilyGroupTotalPlates,
} = familyMetrics;

const catalogFamilyRenderer = window.PedidosApp.createCatalogFamilyRenderer({
  escapeHtml,
  slugify,
  compareText,
  formatCurrency,
  normalizePrice,
  getFamilyQty,
  getVariantQty,
  getProductQty,
  getMaterialQty,
  getFamilyProducts,
  getFamilyVariants,
  hasPlateVariants,
  getVariantBasePlates,
  getFamilyGroupTotalPlates,
  getSinglePlateReference,
  groupProductsBy: window.PedidosApp.groupProductsBy,
  getProductDisplayName,
  getRenderState: () => ({ searchTerm, kitGroupOpenState, catalogAdapter }),
});
const renderCatalogFamily = catalogFamilyRenderer.renderFamilyCard;
const renderValueProductRow = catalogFamilyRenderer.renderValueProductRow;

function normalizeSheetLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const parseFamilyPlateVariant = window.PedidosApp.parseFamilyPlateVariant;

const lettersManager = window.PedidosApp.createLettersManager({
  lettersConfig,
  letterState,
  normalizeQty,
  onChange: render,
  setStatus,
});
const {
  getLetterTotal,
  getActiveLetterFilterLabel,
  getFilteredLetters,
  setLetterQty,
  updateLetterQty,
  summarizeLettersSection,
} = lettersManager;

function clearActiveSection() {
  const section = getActiveThickness();
  if (!section) return;

  if (isLettersSection(section.id)) {
    lettersManager.clearAllQuantities();
    setStatus(`Se limpio la categoria ${section.name}.`, "success");
    render();
    return;
  }

  if (section.type === "price-list") {
    section.products.forEach((product) => {
      delete productQuantities[product.id];
    });
    setStatus(`Se limpio la categoria ${section.name}.`, "success");
    render();
    return;
  }

  if (section.type === "kits") {
    section.families.forEach((family) => {
      delete familyQuantities[family.id];
      family.materialGroups?.forEach((group) => {
        delete materialQuantities[group.id];
      });
      family.products.forEach((product) => {
        delete productQuantities[product.id];
      });
    });
    setStatus(`Se limpio la categoria ${section.name}.`, "success");
    render();
    return;
  }

  section.families.forEach((family) => {
    delete familyQuantities[family.id];
    getFamilyVariants(family).forEach((variant) => {
      delete variantQuantities[variant.id];
    });
    getFamilyProducts(family).forEach((product) => {
      delete productQuantities[product.id];
    });
  });
  setStatus(`Se limpio la categoria ${section.name}.`, "success");
  render();
}

function clearCurrentOrder() {
  Object.keys(familyQuantities).forEach((key) => {
    delete familyQuantities[key];
  });

  Object.keys(variantQuantities).forEach((key) => {
    delete variantQuantities[key];
  });

  Object.keys(materialQuantities).forEach((key) => {
    delete materialQuantities[key];
  });

  Object.keys(productQuantities).forEach((key) => {
    delete productQuantities[key];
  });

  lettersManager.clearAllQuantities();

  summaryOpen = false;
  currentOrderId = createOrderId();
  render();

  if (html.catalogScroll) {
    html.catalogScroll.scrollTo({ top: 0, behavior: "smooth" });
  }
}


function toggleFamily(familyId) {
  const section = getActiveThickness();
  if (!section || isLettersSection(section.id)) return;
  const family = section.families.find((item) => item.id === familyId);
  if (!family) return;
  family.open = !family.open;
  renderFamilies();
}

function toggleKitGroup(groupId) {
  kitGroupOpenState[groupId] = !kitGroupOpenState[groupId];
  renderFamilies();
}

const catalogNavigationRenderer = window.PedidosApp.createCatalogNavigationRenderer({
  html,
  clientConfig,
  escapeHtml,
  getAvailableSections,
  getCatalog: () => catalog,
  getNavigationState: () => ({ categoryHomeOpen, activeThickness }),
  onEmptyCategories: () => {
    categoryHomeOpen = false;
    renderFamilies();
  },
});
function renderTabs() {
  catalogNavigationRenderer.renderTabs();
}
function renderCategoryHome() {
  catalogNavigationRenderer.renderCategoryHome(searchTerm);
}


const lettersRenderer = window.PedidosApp.createLettersRenderer({
  html,
  clientConfig,
  lettersConfig,
  letterState,
  escapeHtml,
  getFilteredLetters,
  getLetterTotal,
  getActiveLetterFilterLabel,
});
const renderQuickStepButtons = lettersRenderer.renderQuickStepButtons;
const renderLettersSection = lettersRenderer.renderLettersSection;

const renderPriceListSection = window.PedidosApp.createPriceListRenderer({
  html,
  clientConfig,
  letterState,
  escapeHtml,
  renderValueProductRow,
  renderQuickStepButtons,
  getRenderState: () => ({ searchTerm, activeCategoryId, kitGroupOpenState }),
});

function renderFamilies() {
  if (categoryHomeOpen) {
    renderCategoryHome();
    return;
  }
  const section = getActiveThickness();
  if (!section) {
    html.families.innerHTML = "";
    html.empty.classList.add("hidden");
    return;
  }

  if (isLettersSection(section.id)) {
    renderLettersSection();
    return;
  }

  if (section.type === "price-list") {
    renderPriceListSection(section);
    return;
  }

  if (section.type === "kits") {
    const cards = section.families.map(renderCatalogFamily).filter(Boolean).join("");
    html.families.innerHTML = cards
      ? `
        <section class="space-y-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Categoria</p>
                <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(section.name)}</p>
              </div>
              <p class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Paso ${escapeHtml(letterState.step)}
              </p>
            </div>
            <div class="flex gap-2 overflow-x-auto scrollbar-hide">${renderQuickStepButtons()}</div>
            <button
              type="button"
              data-category-clear="active"
              class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"
            >
              Limpiar categoria
            </button>
          </div>
          <div class="space-y-3">${cards}</div>
        </section>
      `
      : "";
    html.empty.classList.toggle("hidden", Boolean(cards));
    return;
  }

  const cards = section.families.map(renderCatalogFamily).filter(Boolean).join("");
  html.families.innerHTML = cards;
  html.empty.classList.toggle("hidden", Boolean(cards));
}

function summary() {
  return window.PedidosApp.calculateOrderSummary({
    catalog, getAvailableSections, isLettersSection, summarizeLettersSection,
    getFamilyQty, getMaterialQty, getProductQty, getVariantQty,
    hasPlateVariants, getFamilyVariants, getFamilyProducts,
    getSinglePlateReference, getProductDisplayName, lettersConfig,
  });
}

function formatGrandTotal(data) {
  if (summaryMode === "value") {
    return formatCurrency(data.totalValue);
  }

  return `${data.totalCount} items`;
}

function formatSectionSummaryValue(section, data) {
  if (summaryMode === "value") {
    return formatCurrency(data.totalsByValue[section.id] || 0);
  }

  return formatSectionCount(section.id, data.totalsByThickness[section.id] || 0);
}

function sanitizeMessageText(value) {
  return String(value || "")
    .replace(/\*/g, "")
    .trim();
}

function getProductDisplayName(product) {
  const baseName = String(product?.name || "").trim();
  const plateLabel = String(product?.plateLabel || "").trim();
  if (!baseName) return plateLabel;
  if (!plateLabel) return baseName;
  return `${baseName} - ${plateLabel}`;
}

function renderSummary() {
  const data = summary();
  summaryOpen = window.PedidosApp.renderOrderSummary({
    data,
    availableSections: getAvailableSections(),
    clientConfig,
    summaryMode,
    summaryOpen,
    html,
    catalogAdapter,
    escapeHtml,
    formatCurrency,
    formatGrandTotal,
    formatSectionSummaryValue,
    formatSectionCount,
    getThickness,
  });
}

function buildWhatsAppText() {
  return window.PedidosApp.formatOrderMessage({
    data: summary(), getThickness, sanitizeMessageText,
    formatSectionSummaryValue, formatGrandTotal, catalogAdapter,
  });
}

function buildXubioOrderData() {
  return window.PedidosApp.createXubioOrderData({
    catalog, isLettersSection, lettersConfig, letterState, catalogAdapter,
    getProductQty, getFamilyQty, getMaterialQty, orderId: currentOrderId,
  });
}

const orderSender = window.PedidosApp.createOrderSender({
  clientConfig,
  clientKey,
  html,
  buildMessage: buildWhatsAppText,
  buildOrderData: buildXubioOrderData,
  setStatus,
  onEmailSubmissionState: (pending, message) => {
    emailSubmissionPending = pending;
    pendingEmailStatusMessage = message;
  },
});
const { sendOrder, submitEmailForm } = orderSender;

function bindEvents() {
  window.PedidosApp.bindAppEvents({
    html,
    actions: {
      openCategoryHome: () => {
        categoryHomeOpen = true;
        activeCategoryId = "";
        render();
      },
      selectSection: (sectionId) => {
        activeThickness = sectionId;
        categoryHomeOpen = false;
        activeCategoryId = "";
        render();
      },
      selectCategory: (sectionId, categoryId) => {
        activeThickness = sectionId;
        activeCategoryId = categoryId;
        categoryHomeOpen = false;
        if (html.catalogScroll) html.catalogScroll.scrollTo({ top: 0, behavior: "smooth" });
        render();
      },
      clearOrder: () => {
        clearCurrentOrder();
        setStatus("Se limpió el pedido.", "success");
      },
      toggleFamily,
      toggleKitGroup,
      adjustFamily: (id, action) => updateFamilyQty(id, action === "plus" ? letterState.step : -letterState.step),
      adjustVariant: (id, action) => updateVariantQty(id, action === "plus" ? letterState.step : -letterState.step),
      adjustMaterial: (id, action) => updateMaterialQty(id, action === "plus" ? letterState.step : -letterState.step),
      adjustProduct: (id, action) => updateProductQty(id, action === "plus" ? letterState.step : -letterState.step),
      setLetterStep: (step) => { letterState.step = Number(step); render(); },
      setLetterFilter: (filter) => { letterState.filter = filter; render(); },
      adjustLetter: (letter, size, action) => {
        updateLetterQty(letter, size, action === "increase" ? letterState.step : -letterState.step);
      },
      clearSection: clearActiveSection,
      setFamilyQty,
      setVariantQty,
      setProductQty,
      setMaterialQty,
      setLetterQty,
      search: (term) => { searchTerm = term.trim(); renderFamilies(); },
      toggleSummary: () => { summaryOpen = !summaryOpen; renderSummary(); },
      sendOrder,
      emailFrameLoaded: () => {
        if (!emailSubmissionPending) return;
        emailSubmissionPending = false;
        clearCurrentOrder();
        setStatus(pendingEmailStatusMessage || "Pedido enviado por mail.", "success");
        pendingEmailStatusMessage = "";
      },
      openDesigns: openDesignsModal,
      closeDesigns: closeDesignsModal,
      showScrollButton: showScrollButtonTemporarily,
      hideScrollButton,
      updateScrollButton: () => {
        if (getRemainingScroll() < 24) hideScrollButton();
      },
    },
  });
}

const loadCatalogFromSheet = window.PedidosApp.createCatalogLoader({
  clientConfig,
  catalogAdapter,
  lettersConfig,
  letterState,
  normalizePrice,
  normalizeSheetLabel,
  slugify,
  compareText,
  groupProductsBy: window.PedidosApp.groupProductsBy,
  getThicknessEntries,
  getSectionType,
  parseFamilyPlateVariant,
  isLettersSection,
});

function render() {
  renderTabs();
  updateSearchVisibility();
  renderFamilies();
  renderSummary();
  hideScrollButton();
}

async function init() {
  applyClientUi();
  bindEvents();
  updateSearchVisibility();
  setFamiliesMessage("Cargando esquemas...");

  try {
    catalog = await loadCatalogFromSheet();
    if (!catalog.length) {
      setFamiliesMessage("No hay categorias disponibles para este cliente.");
      html.sendButton.disabled = true;
      return;
    }

    if (!catalog.some((section) => section.id === activeThickness)) {
      activeThickness = catalog[0].id;
    }

    render();
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    setFamiliesMessage(`No se pudieron cargar los esquemas desde Google Sheets. (${detail})`);
    html.sendButton.disabled = true;
  }
}

  return {
    init,
  };
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createAppController = createAppController;
})();
