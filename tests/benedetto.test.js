const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

test("Benedetto tiene una pantalla conectada a su pestaña categorizada", () => {
  const context = vm.createContext({ window: {} });
  const clientsSource = fs.readFileSync(path.join(__dirname, "../clients.js"), "utf8");
  vm.runInContext(clientsSource, context);

  const config = context.window.PEDIDOS_CLIENTS.benedetto;
  assert.equal(config.sheetGid, "1170010108");
  assert.equal(config.catalogSheetGid, "1170010108");
  assert.equal(config.catalogMode, "categorized-price-list");
  assert.equal(config.categoryHome, true);
  assert.equal(config.hideCategoryControls, true);
  assert.equal(config.sendXubioOrder, false);

  const page = fs.readFileSync(path.join(__dirname, "../benedetto/index.html"), "utf8");
  assert.match(page, /window\.APP_CLIENT_KEY = "benedetto"/);
  assert.match(page, /\.\.\/clients\.js/);
  assert.match(page, /categorized_price_list\.js/);

  const home = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(home, /href="\.\/benedetto\/index\.html"/);
});
