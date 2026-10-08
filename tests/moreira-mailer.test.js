/** Prueba el flujo completo de Apps Script con Gmail y Xubio simulados. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

test("Bongiovanni crea un presupuesto, envía el correo y evita duplicar el presupuesto", () => {
  const emails = [];
  const budgets = [];
  const properties = new Map();
  const context = vm.createContext({
    console,
    GmailApp: { sendEmail: (...args) => emails.push(args) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key) => properties.get(key),
      setProperty: (key, value) => properties.set(key, value),
    }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { formatDate: () => "2026-10-07" },
    Session: { getScriptTimeZone: () => "America/Buenos_Aires" },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../google_apps_script/moreira_mailer/Code.gs"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../google_apps_script/moreira_mailer/CopiaCliente.gs"), "utf8"), context);
  properties.set("PEDIDOS_COPIA_5482024", "bongiovanni@example.com");
  context.getXubioToken = () => "test-token";
  context.xubioFetchJson = (url, token, method, payload) => {
    if (method === "get") {
      assert.match(url, /clienteBean\/5482024$/);
      return { listaPrecioVenta: { ID: 10194 } };
    }
    budgets.push(payload);
    return { ID: 123, transaccionid: 456 };
  };
  const request = { parameter: {
    client_key: "bongiovanni",
    to: "mymfibrofacil.web@gmail.com",
    subject: "Bongiovanni - prueba simulada",
    body: "2 tandas de juguetero: 10 jugueteros y 4 sillas",
    order_data: JSON.stringify({ orderId: "bongiovanni-simulado", items: [
      { descripcion: "Juguetero Bajo x2 - juguetero", cantidad: 10, precio: 56600 },
      { descripcion: "Juguetero Bajo x2 - silla", cantidad: 4, precio: 15700 },
    ] }),
  } };
  const response = context.doPost(request);
  assert.equal(response.ok, true);
  assert.equal(budgets.length, 1);
  assert.equal(budgets[0].cliente.ID, 5482024);
  assert.equal(budgets[0].descripcion, "Hecho por Dr. Astilla");
  assert.equal(budgets[0].listaDePrecio.ID, 10194);
  assert.equal(budgets[0].importetotal, 628800);
  assert.equal(budgets[0].transaccionProductoItems[1].cantidad, 4);
  assert.equal(budgets[0].transaccionProductoItems[0].producto.ID, 1811046);
  const orderEmail = emails.find((email) => email[1] === request.parameter.subject);
  assert.equal(orderEmail[0], "mymfibrofacil.web@gmail.com");
  const printEmail = emails.find((email) => email[1].startsWith("[IMPRIMIR XUBIO]"));
  assert.equal(printEmail[0], "mymfibrofacil@gmail.com");
  assert.match(printEmail[2], /XUBIO_PRINT_JOB:/);
  const customerCopy = emails.find((email) => email[1].startsWith("Copia de tu pedido -"));
  assert.equal(customerCopy[0], "bongiovanni@example.com");
  assert.match(customerCopy[2], /2 tandas de juguetero/);
  assert.doesNotMatch(customerCopy[2], /XUBIO_PRINT_JOB/);
  assert.equal(context.doPost(request).ok, true);
  assert.equal(budgets.length, 1);
  assert.equal(emails.filter((email) => email[1].startsWith("[IMPRIMIR XUBIO]")).length, 1);
  assert.equal(emails.filter((email) => email[1].startsWith("Copia de tu pedido -")).length, 1);
});

test("Moreira, Valeria y Alan imprimen y reciben copia; Rivadavia queda excluido", () => {
  for (const [key, clientId, subject] of [
    ["moreira", 5481719, "Moreira - prueba simulada"],
    ["valeria", 5482182, "Valeria Lotz - prueba simulada"],
    ["alan_alfonsin", 5481712, "Pedido Alan Alfonsín - prueba simulada"],
    ["rivadavia", 7756831, "Rivadavia - prueba simulada"],
  ]) {
    const emails = [];
    const budgets = [];
    const properties = new Map();
    const context = vm.createContext({
      console,
      GmailApp: { sendEmail: (...args) => emails.push(args) },
      PropertiesService: { getScriptProperties: () => ({
        getProperty: (name) => properties.get(name),
        setProperty: (name, value) => properties.set(name, value),
      }) },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      Utilities: { formatDate: () => "2026-10-08" },
      Session: { getScriptTimeZone: () => "America/Buenos_Aires" },
      ContentService: {
        MimeType: { JSON: "application/json" },
        createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
      },
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../google_apps_script/moreira_mailer/Code.gs"), "utf8"), context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../google_apps_script/moreira_mailer/CopiaCliente.gs"), "utf8"), context);
    if (key !== "rivadavia") properties.set(`PEDIDOS_COPIA_${clientId}`, `${key}@example.com`);
    context.getXubioToken = () => "test-token";
    context.xubioFetchJson = (url, token, method, payload) => {
      if (method === "get") {
        assert.match(url, new RegExp(`clienteBean/${clientId}$`));
        return { listaPrecioVenta: { ID: 10194 } };
      }
      budgets.push(payload);
      return { ID: 123, transaccionid: 456 };
    };
    const response = context.doPost({ parameter: {
      client_key: key,
      to: "mymfibrofacil.web@gmail.com",
      subject,
      body: "Pedido simulado",
      order_data: JSON.stringify({ orderId: `${key}-simulado`, items: [
        { descripcion: "Producto de prueba", cantidad: 1, precio: 100 },
      ] }),
    } });
    assert.equal(response.ok, true);
    const notices = emails.filter((email) => email[1].startsWith("[IMPRIMIR XUBIO]"));
    const copies = emails.filter((email) => email[1].startsWith("Copia de tu pedido -"));
    if (key === "rivadavia") {
      assert.equal(budgets.length, 0);
      assert.equal(notices.length, 0);
      assert.equal(copies.length, 0);
    } else {
      assert.equal(budgets.length, 1);
      assert.equal(budgets[0].cliente.ID, clientId);
      assert.equal(notices.length, 1);
      assert.equal(notices[0][0], "mymfibrofacil@gmail.com");
      assert.match(notices[0][2], new RegExp(`"clientKey":"${clientId}"`));
      assert.equal(copies.length, 1);
      assert.equal(copies[0][0], `${key}@example.com`);
    }
  }
});
