(() => {
const DEFAULT_CLIENT_KEY = "rivadavia";
const DEFAULT_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "Ñ",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

const DEFAULT_LETTER_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "vowels", label: "Vocales" },
  { id: "consonants", label: "Consonantes" },
  { id: "loaded", label: "Cargadas" },
];

function normalizeClientKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "");
}

function detectClientKey(clients) {
  const explicitKey = normalizeClientKey(window.APP_CLIENT_KEY);
  if (explicitKey && clients[explicitKey]) return explicitKey;

  const params = new URLSearchParams(window.location.search);
  const queryKey = normalizeClientKey(params.get("client") || params.get("cliente"));
  if (queryKey && clients[queryKey]) return queryKey;

  const segments = window.location.pathname.split("/").filter(Boolean);
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : "";
  const pathKey = lastSegment && !lastSegment.includes(".") ? normalizeClientKey(lastSegment) : "";
  if (pathKey && clients[pathKey]) return pathKey;

  return DEFAULT_CLIENT_KEY;
}

function createClientContext() {
  const clients = window.PEDIDOS_CLIENTS || {};
  const clientKey = detectClientKey(clients);
  const clientConfig = clients[clientKey] || clients[DEFAULT_CLIENT_KEY] || null;
  const thicknessMeta = clientConfig?.thicknessMeta || {};
  const assetPrefix = window.APP_ASSET_PREFIX || "./";
  const summaryMode = clientConfig?.summaryMode || "count";

  const lettersConfig = {
    materialLabel: clientConfig?.lettersConfig?.materialLabel || "MDF 5 mm",
    priceRowLabel: clientConfig?.lettersConfig?.priceRowLabel || "$ Unit",
    taxRate: Number.isFinite(Number(clientConfig?.lettersConfig?.taxRate))
      ? Number(clientConfig.lettersConfig.taxRate)
      : 0.21,
    sizes: Array.isArray(clientConfig?.lettersConfig?.sizes) && clientConfig.lettersConfig.sizes.length
      ? clientConfig.lettersConfig.sizes.map((value) => String(value))
      : ["22", "27", "33"],
    quickSteps: Array.isArray(clientConfig?.lettersConfig?.quickSteps) && clientConfig.lettersConfig.quickSteps.length
      ? clientConfig.lettersConfig.quickSteps.map((value) => Number(value)).filter(Number.isFinite)
      : [1, 5, 10],
    filters: Array.isArray(clientConfig?.lettersConfig?.filters) && clientConfig.lettersConfig.filters.length
      ? clientConfig.lettersConfig.filters
      : DEFAULT_LETTER_FILTERS,
    letters: Array.isArray(clientConfig?.lettersConfig?.letters) && clientConfig.lettersConfig.letters.length
      ? clientConfig.lettersConfig.letters.map((value) => String(value))
      : DEFAULT_LETTERS,
  };

  return {
    DEFAULT_CLIENT_KEY,
    DEFAULT_LETTER_FILTERS,
    DEFAULT_LETTERS,
    assetPrefix,
    clientConfig,
    clientKey,
    lettersConfig,
    summaryMode,
    thicknessMeta,
  };
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createClientContext = createClientContext;
})();
