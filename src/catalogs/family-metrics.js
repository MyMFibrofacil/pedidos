/** Calcula cantidades de productos, familias y variantes de placa. */
(() => {
  function parseFamilyPlateVariant(familyName) {
    const rawName = String(familyName || "").trim();
    const match = rawName.match(/^(.*)\s-\s(\d+\s*x\s*\d+)\s*$/i);
    if (!match) return { familyName: rawName, plateLabel: "" };
    return {
      familyName: String(match[1] || "").trim(),
      plateLabel: String(match[2] || "").replace(/\s+/g, "").toLowerCase(),
    };
  }

  function createFamilyMetrics({ getFamilyQty, getVariantQty }) {
    function getFamilyProducts(family) {
      if (Array.isArray(family?.variants) && family.variants.length > 0) {
        return family.variants.flatMap((variant) => variant.products || []);
      }
      return family?.products || [];
    }

    function getFamilyVariants(family) {
      return Array.isArray(family?.variants) ? family.variants : [];
    }

    function hasPlateVariants(family) {
      return family?.type === "grupo" && getFamilyVariants(family).length > 1;
    }

    function getSinglePlateReference(family) {
      if (family?.type !== "grupo") return "";
      const variants = getFamilyVariants(family);
      return variants.length === 1 ? String(variants[0].plateLabel || "").trim() : "";
    }

    function getVariantBasePlates(variant) {
      return (variant?.products || []).reduce((total, product) => total + (product.plates || 0), 0);
    }

    function getVariantTotalPlates(variant) {
      return getVariantBasePlates(variant) * getVariantQty(variant.id);
    }

    function getFamilyGroupTotalPlates(family) {
      if (hasPlateVariants(family)) {
        return getFamilyVariants(family).reduce((sum, variant) => sum + getVariantTotalPlates(variant), 0);
      }
      const familyQty = getFamilyQty(family.id);
      return getFamilyProducts(family).reduce((total, product) => total + product.plates, 0) * familyQty;
    }

    return {
      getFamilyProducts, getFamilyVariants, hasPlateVariants,
      getSinglePlateReference, getVariantBasePlates, getVariantTotalPlates,
      getFamilyGroupTotalPlates,
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createFamilyMetrics = createFamilyMetrics;
  window.PedidosApp.parseFamilyPlateVariant = parseFamilyPlateVariant;
})();
