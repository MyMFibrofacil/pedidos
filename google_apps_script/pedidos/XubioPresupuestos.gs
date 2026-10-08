function crearPresupuestoXubio(payload) {
  const requestedClientId = Number(
    payload.client_id || payload.clientId || payload.cliente_id || payload.clienteId
  );
  const clientKey = String(payload.client_key || payload.clientKey || "").trim().toLowerCase();
  const resolvedClientId = Number.isInteger(requestedClientId) && requestedClientId > 0
    ? String(requestedClientId)
    : XUBIO.clientsByKey[clientKey];
  const client = XUBIO.clientsById[resolvedClientId];
  if (!client) {
    throw new Error("El pedido no corresponde a un cliente habilitado para Xubio.");
  }

  const order = parseOrderData(payload.order_data || payload.orderData);
  const idempotencyKey = `xubio-presupuesto-${client.id}-${order.orderId}`;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const existing = properties.getProperty(idempotencyKey);
    if (existing) {
      return { created: false, duplicate: true, ...JSON.parse(existing) };
    }

    const token = getXubioToken();
    const customer = xubioFetchJson(`${XUBIO.clienteUrl}/${client.id}`, token, "get");
    const listaPrecio = customer && customer.listaPrecioVenta;
    const listaPrecioId = Number(
      client.listaPrecioId || (listaPrecio && (listaPrecio.ID || listaPrecio.id))
    );
    if (!Number.isFinite(listaPrecioId) || listaPrecioId <= 0) {
      throw new Error(`Xubio no devolvio la lista de precios para ${client.name}.`);
    }

    const listaPrecioDetalle = client.priceFromList
      ? xubioFetchJson(`${XUBIO.listaPrecioUrl}/${listaPrecioId}`, token, "get")
      : null;

    const result = xubioFetchJson(
      XUBIO.presupuestoUrl,
      token,
      "post",
      buildPresupuestoPayload(client, listaPrecioId, order, listaPrecioDetalle)
    );
    const record = {
      created: true,
      createdAt: new Date().toISOString(),
      presupuestoId: result && (result.ID || result.id || result.presupuestoId) || null,
      transaccionId: Number(result && (result.transaccionid || result.transaccionId)) || null,
      orderId: order.orderId,
      clientKey: resolvedClientId,
    };
    properties.setProperty(idempotencyKey, JSON.stringify(record));
    return record;
  } finally {
    lock.releaseLock();
  }
}
function getListaPrecioItemPrice(listaPrecioDetalle, productoId) {
  const items = listaPrecioDetalle && Array.isArray(listaPrecioDetalle.listaPrecioItem)
    ? listaPrecioDetalle.listaPrecioItem
    : [];
  const match = items.find((item) => {
    const producto = item && item.producto;
    return producto && Number(producto.ID || producto.id) === Number(productoId);
  });
  const price = Number(match && match.precio);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Xubio no devolvio precio para el producto ${productoId} en la lista ${listaPrecioDetalle && (listaPrecioDetalle.ID || listaPrecioDetalle.id) || "solicitada"}.`);
  }
  return price;
}
function buildPresupuestoPayload(client, listaPrecioId, order, listaPrecioDetalle) {
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const items = order.items.map((item) => {
    const productoId = Number(
      item.productoId ||
      (client.productsByThickness && client.productsByThickness[String(item.espesor)]) ||
      XUBIO.productId
    );
    const precio = client.priceFromList
      ? getListaPrecioItemPrice(listaPrecioDetalle, productoId)
      : item.precio;
    const itemSubtotal = roundMoney(item.cantidad * precio);
    return {
      producto: { ID: productoId, id: productoId },
      centroDeCosto: { ID: XUBIO.defaults.centroCostoId, id: XUBIO.defaults.centroCostoId },
      deposito: { ID: XUBIO.defaults.depositoId, id: XUBIO.defaults.depositoId },
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio,
      iva: 0,
      montoExento: itemSubtotal,
      importe: itemSubtotal,
      total: itemSubtotal,
      porcentajeDescuento: 0,
    };
  });
  const total = roundMoney(items.reduce((sum, item) => sum + item.total, 0));

  return {
    externalId: `WEB-${order.orderId}`,
    cliente: { ID: client.id, id: client.id },
    nombre: `Pedido web - ${client.name}`,
    descripcion: "Hecho por Dr. Astilla",
    fecha: date,
    fechaVto: date,
    puntoVenta: { ID: XUBIO.defaults.puntoVentaId, id: XUBIO.defaults.puntoVentaId },
    deposito: { ID: XUBIO.defaults.depositoId, id: XUBIO.defaults.depositoId },
    provincia: { ID: XUBIO.defaults.provinciaId, id: XUBIO.defaults.provinciaId },
    listaDePrecio: { ID: listaPrecioId, id: listaPrecioId },
    vendedor: { vendedorId: XUBIO.defaults.vendedorId },
    condicionDePago: XUBIO.defaults.condicionDePago,
    cotizacion: 1,
    cotizacionListaDePrecio: 1,
    importeGravado: 0,
    importeImpuestos: 0,
    importetotal: total,
    facturaNoExportacion: true,
    transaccionProductoItems: items,
  };
}
function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
