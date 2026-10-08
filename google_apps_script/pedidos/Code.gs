const DEFAULT_TO = "mymfibrofacil@gmail.com,mymfibrofacil.web@gmail.com";
const DEFAULT_SUBJECT_PREFIX = "Moreira";
const PRINT_NOTIFICATION_TO = "mymfibrofacil@gmail.com";
const PRINT_SUBJECT_PREFIX = "[IMPRIMIR XUBIO]";
const PRINTABLE_XUBIO_CLIENT_IDS = [5481719, 5482182, 5481712, 5482024];
const FABRICAAPP_CLIENT_ID = 7756831;

// Configuracion de Xubio. Los dos secretos se guardan solamente en Script
// Properties, nunca en este archivo ni en GitHub.
const XUBIO = {
  tokenUrl: "https://xubio.com/API/1.1/TokenEndpoint",
  clienteUrl: "https://xubio.com/API/1.1/clienteBean",
  listaPrecioUrl: "https://xubio.com/API/1.1/listaPrecioBean",
  presupuestoUrl: "https://xubio.com/API/1.1/presupuestoBean",
  productId: 1811046,
  defaults: {
    puntoVentaId: 125761,
    depositoId: 1731,
    provinciaId: 1,
    vendedorId: 12412,
    condicionDePago: 2,
    centroCostoId: 66456,
  },
  clientsById: {
    "7756831": {
      id: 7756831,
      name: "CARPINTERIA RIVADAVIA SA",
      listaPrecioId: 10194,
      priceFromList: true,
      productsByThickness: { "3": 2465942, "15": 2465943 },
    },
    "5481719": { id: 5481719, name: "ALEJANDRO FABIAN MOREIRA DUPLAA" },
    "5482182": { id: 5482182, name: "HORACIO MAXIMILIANO NERVI / Valeria Lotz" },
    "5481712": { id: 5481712, name: "ALAN JAVIER ALFONSIN" },
    "5482024": { id: 5482024, name: "MARIA VICTORIA BONGIOVANNI" },
  },
  clientsByKey: {
    rivadavia: "7756831",
    moreira: "5481719",
    valeria: "5482182",
    alan_alfonsin: "5481712",
    bongiovanni: "5482024",
  },
};

function doPost(e) {
  try {
    const payload = getPayload(e);
    const now = new Date();
    const subject =
      String(payload.subject || "").trim() ||
      `${DEFAULT_SUBJECT_PREFIX} - ${Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy")}`;
    let body = String(payload.body || "").trim();
    const to = String(payload.to || DEFAULT_TO).trim();

    if (!body) {
      return jsonResponse({ ok: false, error: "Falta el cuerpo del pedido." });
    }
    const customerBody = body;
    GmailApp.sendEmail(to, subject, customerBody, {
      name: "Pedidos a medida",
      replyTo: String(payload.from || "").trim() || undefined,
    });

    let copyError = "";
    if (payload.order_data || payload.orderData) {
      try {
        enviarCopiaCliente(payload, subject, customerBody);
      } catch (error) {
        copyError = error && error.message ? error.message : "Error desconocido al enviar la copia al cliente.";
        console.error(error && error.stack ? error.stack : copyError);
      }
    }

    let presupuesto = { created: false, skipped: true };
    let xubioError = "";
    let printError = "";
    const routeToFabricaApp = shouldRouteToFabricaApp(payload);
    if ((payload.order_data || payload.orderData) && !routeToFabricaApp) {
      try {
        presupuesto = crearPresupuestoXubio(payload);
      } catch (error) {
        xubioError = error && error.message ? error.message : "Error desconocido al crear el presupuesto.";
        console.error(error && error.stack ? error.stack : xubioError);
      }
    }

    if (!xubioError && presupuesto.transaccionId) {
      try {
        if (PRINTABLE_XUBIO_CLIENT_IDS.includes(Number(presupuesto.clientKey))) {
          enviarOrdenImpresionXubio(presupuesto, subject);
        }
      } catch (error) {
        printError = error && error.message ? error.message : "Error desconocido al enviar la orden de impresion.";
        console.error(error && error.stack ? error.stack : printError);
      }
    }

    const notes = [];
    if (xubioError) notes.push(`No se pudo crear el presupuesto automatico en Xubio.\nError: ${xubioError}`);
    if (printError) notes.push(`El presupuesto se creo, pero no se pudo enviar la orden de impresion.\nError: ${printError}`);
    if (notes.length) {
      GmailApp.sendEmail(to, `${xubioError ? "[REVISAR XUBIO] " : "[REVISAR IMPRESION] "}${subject}`,
        `${customerBody}\n\n---\n${notes.join("\n\n")}`, { name: "Pedidos a medida" });
    }

    return jsonResponse({
      ok: !xubioError && !printError && !copyError,
      routedToFabricaApp: routeToFabricaApp,
      presupuesto,
      copyError: copyError || undefined,
      error: xubioError || printError || copyError || undefined,
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : "Error desconocido",
    });
  }
}
function shouldRouteToFabricaApp(payload) {
  const requestedClientId = Number(
    payload.client_id || payload.clientId || payload.cliente_id || payload.clienteId
  );
  if (requestedClientId === FABRICAAPP_CLIENT_ID) return true;

  const clientKey = String(payload.client_key || payload.clientKey || "").trim().toLowerCase();
  return clientKey === "rivadavia";
}
function getPayload(e) {
  const params = (e && e.parameter) || {};
  if (params.body || params.subject || params.to || params.from) {
    return params;
  }

  return JSON.parse((e && e.postData && e.postData.contents) || "{}");
}
function enviarOrdenImpresionXubio(presupuesto, subject, recipient = PRINT_NOTIFICATION_TO) {
  const transaccionId = Number(presupuesto && presupuesto.transaccionId);
  const orderId = String(presupuesto && presupuesto.orderId || "").trim();
  if (!Number.isFinite(transaccionId) || transaccionId <= 0 || !orderId) {
    throw new Error("Xubio creo el presupuesto, pero no devolvio los datos necesarios para imprimirlo.");
  }

  const properties = PropertiesService.getScriptProperties();
  const printKey = `xubio-print-${String(presupuesto.clientKey || "pedido")}-${orderId}`;
  if (properties.getProperty(printKey)) return;

  const job = {
    transaccionId,
    orderId,
    clientKey: String(presupuesto.clientKey || ""),
  };
  GmailApp.sendEmail(
    recipient,
    `${PRINT_SUBJECT_PREFIX} ${subject}`,
    `Orden interna para imprimir un presupuesto ya creado en Xubio.\nXUBIO_PRINT_JOB: ${JSON.stringify(job)}`,
    { name: "Pedidos a medida" }
  );
  properties.setProperty(printKey, new Date().toISOString());
}
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
