/** Envía al cliente una copia limpia del pedido sin registrar personas. */
const CUSTOMER_COPY_CLIENT_IDS = [5481719, 5482182, 5481712, 5482024];

function enviarCopiaCliente(payload, subject, orderBody) {
  const clientKey = String(payload.client_key || payload.clientKey || "").trim().toLowerCase();
  const clientId = Number(XUBIO.clientsByKey[clientKey]);
  if (!CUSTOMER_COPY_CLIENT_IDS.includes(clientId)) return { skipped: true };

  const properties = PropertiesService.getScriptProperties();
  const recipient = String(properties.getProperty(`PEDIDOS_COPIA_${clientId}`) || "").trim();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(recipient)) {
    throw new Error(`Falta configurar un correo válido para la copia del cliente ${clientId}.`);
  }

  const order = parseOrderData(payload.order_data || payload.orderData);
  const sentKey = `pedido-copia-${clientId}-${order.orderId}`;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (properties.getProperty(sentKey)) return { duplicate: true };
    GmailApp.sendEmail(
      recipient,
      `Copia de tu pedido - ${subject}`,
      `Recibimos tu pedido. Esta es una copia para que conserves el detalle:\n\n${orderBody}`,
      { name: "Pedidos a medida", replyTo: "mymfibrofacil.web@gmail.com" }
    );
    properties.setProperty(sentKey, new Date().toISOString());
    return { sent: true };
  } finally {
    lock.releaseLock();
  }
}
