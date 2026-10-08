/** Verifica tandas completas, filas complementarias y compatibilidad del controlador. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const table = (headers, rows) => ({ table: {
  cols: headers.map((label) => ({ label })),
  rows: rows.map((values) => ({ c: values.map((v) => ({ v })) })),
} });
const batchData = () => table(["Producto", "salen", "Tanda", "$ Unitario", "$ Total"], [
  ["Cama Emi", "cama", 6, 131000, 786000],
  ["Juguetero Bajo x2", "juguetero", 5, 56600, 283000],
  ["", "silla", 2, 15700, 31400],
  ["Librero Pared", "librero pared", 4, 35500, 142000],
  ["", "silla", 1, 15700, 15700],
]);

function createEnvironment(clientKey, data) {
  const context = vm.createContext({
    window: { APP_CLIENT_KEY: clientKey }, console, Intl, URLSearchParams,
    setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, text: async () =>
      `google.visualization.Query.setResponse(${JSON.stringify(data)});` }),
  });
  for (const file of [
    "clients.js", "src/config/client.js", "src/state/create-app-state.js",
    "src/state/create-quantity-manager.js",
    "src/state/create-letters-manager.js",
    "src/catalogs/bongiovanni.js", "src/data/google-sheets.js",
    "src/order/summary.js", "src/order/message.js", "src/order/xubio-order.js",
    "src/order/send-order.js",
    "src/utils/catalog-groups.js", "src/catalogs/create-catalog-loader.js",
    "src/ui/catalog-family-renderer.js",
    "src/ui/order-summary-renderer.js",
    "src/ui/catalog-navigation-renderer.js", "src/ui/letters-section-renderer.js",
    "src/ui/price-list-renderer.js",
    "src/events/bind-app-events.js",
    "src/ui/create-screen-feedback.js",
  ]) {
    vm.runInContext(source(file), context);
  }
  // Expone funciones internas solamente en memoria para verificar el código real.
  const controllerSource = source("src/controller/create-app-controller.js").replace(
    /return \{\s*init,\s*\};/,
    "return { init, loadCatalogFromSheet, summary, buildWhatsAppText, buildXubioOrderData, submitEmailForm, renderQuickStepButtons, renderPriceListSection, renderFamilies, renderSummary, bindEvents, clearCurrentOrder, setCatalog: value => { catalog = value; } };"
  );
  vm.runInContext(controllerSource, context);
  const api = context.window.PedidosApp;
  const client = api.createClientContext();
  const state = api.createAppState(client.thicknessMeta, client.lettersConfig);
  const fields = {};
  const html = { emailForm: {
    elements: { namedItem: (name) => fields[name] ||= { value: "" } },
    submit: () => { html.submitted = true; },
  } };
  const controller = api.createAppController({ ...client, state, html });
  return { api, state, html, fields, controller };
}

test("conserva las sillas adicionales y calcula el precio de toda la tanda", async () => {
  const { controller, state } = createEnvironment("bongiovanni", batchData());
  const catalog = await controller.loadCatalogFromSheet();
  assert.equal(catalog[0].products.length, 3);
  assert.equal(catalog[0].products[1].unitPrice, 314400);
  assert.equal(catalog[0].products[2].unitPrice, 157700);
  controller.setCatalog(catalog);
  state.productQuantities[catalog[0].products[1].id] = 2;
  assert.equal(controller.summary().totalValue, 628800);
  assert.match(controller.buildWhatsAppText(), /Tandas: 2\n  - juguetero: 10\n  - silla: 4/);
  assert.equal(controller.renderQuickStepButtons(), "");
});

test("interpreta importes argentinos y rechaza tandas o precios inconsistentes", () => {
  const { api } = createEnvironment("bongiovanni", batchData());
  const adapter = api.catalogAdapters["bongiovanni-batches"];
  const formatted = batchData();
  formatted.table.rows[0].c[3].v = "$ 131.000,00";
  formatted.table.rows[0].c[4].v = "$ 786.000,00";
  assert.equal(adapter.createCatalog(formatted)[0].products[0].unitPrice, 786000);
  const invalid = batchData();
  invalid.table.rows[0].c[4].v = 1;
  assert.throws(() => adapter.createCatalog(invalid), /no coincide/);
  const orphan = batchData();
  orphan.table.rows[0].c[0].v = "";
  assert.throws(() => adapter.createCatalog(orphan), /faltante/);
});

test("prepara correo y presupuesto con las unidades reales de todas las tandas", async () => {
  const { controller, state, html, fields } = createEnvironment("bongiovanni", batchData());
  const catalog = await controller.loadCatalogFromSheet();
  controller.setCatalog(catalog);
  state.productQuantities[catalog[0].products[0].id] = 1;
  controller.submitEmailForm(controller.buildWhatsAppText());
  assert.equal(html.submitted, true);
  assert.equal(fields.client_key.value, "bongiovanni");
  assert.match(fields.subject.value, /^Bongiovanni - /);
  assert.equal(fields.to.value, "mymfibrofacil.web@gmail.com");
  assert.match(fields.body.value, /cama: 6/);
  const order = JSON.parse(fields.order_data.value);
  assert.equal(order.items[0].cantidad, 6);
  assert.equal(order.items[0].precio, 131000);
  state.productQuantities[catalog[0].products[1].id] = 2;
  const items = controller.buildXubioOrderData().items;
  assert.equal(items[1].cantidad, 10);
  assert.equal(items[2].cantidad, 4);
  assert.equal(items.reduce((total, item) => total + item.cantidad * item.precio, 0), controller.summary().totalValue);
});

test("la pantalla muestra solo Limpiar pedido y conserva los encabezados de otros clientes", async () => {
  for (const key of ["bongiovanni", "valeria"]) {
    const data = key === "bongiovanni" ? batchData() : table(
      ["Sección", "Categoría", "Producto", "Modelo", "Precio"], [["MDF", "Cajas", "Caja", "A", 100]]
    );
    const { controller, html } = createEnvironment(key, data);
    html.families = { innerHTML: "" };
    html.empty = { classList: { add() {}, remove() {} } };
    const catalog = await controller.loadCatalogFromSheet();
    controller.setCatalog(catalog);
    controller.renderPriceListSection(catalog[0]);
    if (key === "bongiovanni") {
      assert.match(html.families.innerHTML, /data-order-clear/);
      assert.doesNotMatch(html.families.innerHTML, /Limpiar categoria|>Categoria<|data-letter-step/);
    } else {
      assert.match(html.families.innerHTML, /Limpiar categoria|>Categoria</);
    }
  }
});

test("Moreira, Valeria, Alan y Rivadavia conservan sus cálculos y selectores", async () => {
  for (const key of ["moreira", "valeria", "alan_alfonsin", "rivadavia"]) {
    const data = key === "rivadavia"
      ? table(["Familia", "Producto", "placas", "espesor", "tipo", "placa"], [
        ["GL15", "Grafico 1", 50, 3, "grupo", "260x183"],
        ["GL15", "Grafico 2", 34, 3, "grupo", "260x183"],
      ])
      : key === "moreira"
        ? table(["Sección", "Categoría", "Producto", "Material", "Precio"], [["Individuales", "Otros", "Caja", "3mm", 100]])
        : table(["Sección", "Categoría", "Producto", "Modelo", "Precio", "Activo"], [["MDF", "Cajas", "Caja", "A", 100, "si"]]);
    const { controller, state, html } = createEnvironment(key, data);
    const catalog = await controller.loadCatalogFromSheet();
    controller.setCatalog(catalog);
    if (key === "rivadavia") {
      state.familyQuantities[catalog[0].families[0].id] = 2;
      assert.equal(controller.summary().totalCount, 168);
      catalog[0].families[0].open = true;
      html.families = { innerHTML: "" };
      html.empty = { classList: { add() {}, remove() {}, toggle() {} } };
      controller.renderFamilies();
      assert.match(html.families.innerHTML, /Grafico 1/);
    } else {
      state.productQuantities[catalog[0].products[0].id] = 2;
      assert.equal(controller.summary().totalValue, 200);
      assert.match(controller.buildWhatsAppText(), /Cantidad: 2/);
    }
    assert.match(controller.renderQuickStepButtons(), /data-letter-step/);
  }
});

test("el resumen presenta totales y detalle a partir del pedido calculado", async () => {
  const { controller, state, html } = createEnvironment("bongiovanni", batchData());
  html.summaryTotals = { innerHTML: "" };
  html.summaryDetailsList = { innerHTML: "" };
  html.summaryDetailsPanel = { classList: { toggle() {} } };
  html.summaryChevron = { style: {} };
  html.sendButton = { disabled: true };
  const catalog = await controller.loadCatalogFromSheet();
  controller.setCatalog(catalog);
  state.productQuantities[catalog[0].products[0].id] = 2;

  controller.renderSummary();

  assert.match(html.summaryTotals.innerHTML, /Total general:/);
  assert.match(html.summaryDetailsList.innerHTML, /Cama Emi/);
  assert.equal(html.sendButton.disabled, false);
});

test("el cargador arma agrupaciones compartidas de kits de Moreira", async () => {
  const data = table(["Sección", "Categoría", "Producto", "Material", "Precio"], [
    ["Kits", "Comedor", "Mesa", "MDF 3", 120],
    ["Kits", "Comedor", "Silla", "MDF 3", 80],
  ]);
  const { controller } = createEnvironment("moreira", data);
  const catalog = await controller.loadCatalogFromSheet();

  assert.equal(catalog[0].families[0].materialGroups.length, 1);
  assert.equal(catalog[0].families[0].materialGroups[0].basePrice, 200);
});
