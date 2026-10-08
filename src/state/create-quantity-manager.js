/** Centraliza la lectura y actualización de cantidades del pedido. */
(() => {
  function createQuantityManager({ state, normalizeQty, onChange }) {
    const collections = {
      family: state.familyQuantities,
      variant: state.variantQuantities,
      product: state.productQuantities,
      material: state.materialQuantities,
    };

    function get(type, id) {
      return collections[type][id] || 0;
    }

    function set(type, id, value) {
      const next = normalizeQty(value);
      if (next === 0) {
        delete collections[type][id];
      } else {
        collections[type][id] = next;
      }
      onChange();
    }

    function update(type, id, delta) {
      set(type, id, get(type, id) + delta);
    }

    return {
      quantities: collections,
      getFamilyQty: (id) => get("family", id),
      getVariantQty: (id) => get("variant", id),
      getProductQty: (id) => get("product", id),
      getMaterialQty: (id) => get("material", id),
      setFamilyQty: (id, value) => set("family", id, value),
      updateFamilyQty: (id, delta) => update("family", id, delta),
      setVariantQty: (id, value) => set("variant", id, value),
      updateVariantQty: (id, delta) => update("variant", id, delta),
      setProductQty: (id, value) => set("product", id, value),
      updateProductQty: (id, delta) => update("product", id, delta),
      setMaterialQty: (id, value) => set("material", id, value),
      updateMaterialQty: (id, delta) => update("material", id, delta),
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createQuantityManager = createQuantityManager;
})();
