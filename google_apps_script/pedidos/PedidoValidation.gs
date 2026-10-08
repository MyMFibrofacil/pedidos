function parseOrderData(raw) {
  let order;
  try {
    order = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_error) {
    throw new Error("No se pudo leer el detalle del pedido para Xubio.");
  }

  const orderId = String(order && order.orderId || "").trim();
  const items = Array.isArray(order && order.items) ? order.items : [];
  if (!orderId || items.length === 0) {
    throw new Error("El pedido no tiene renglones validos para crear el presupuesto.");
  }

  const normalizedItems = items.map((item) => {
    const descripcion = String(item.descripcion || "").trim();
    const cantidad = Number(item.cantidad);
    const precio = Number(item.precio);
    const productoId = item.productoId === undefined || item.productoId === null || item.productoId === ""
      ? null
      : Number(item.productoId);
    if (!descripcion || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precio) || precio < 0) {
      throw new Error("Hay un renglon con descripcion, cantidad o precio invalido.");
    }
    if (productoId !== null && (!Number.isInteger(productoId) || productoId <= 0)) {
      throw new Error("Hay un renglon con producto Xubio invalido.");
    }
    return {
      descripcion,
      cantidad,
      precio,
      productoId,
      espesor: String(item.espesor || "").trim(),
    };
  });
    return { orderId, items: normalizedItems };
  }
