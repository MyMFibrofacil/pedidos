/** Convierte el resumen del pedido en un mensaje para mail o WhatsApp. */
(() => {
function formatOrderMessage({ data, getThickness, sanitizeMessageText, formatSectionSummaryValue, formatGrandTotal, catalogAdapter }) {
  const lines = [];

  data.sections.forEach((section) => {
    const sectionMeta = getThickness(section.id);
    const sectionLabel =
      section.type === "price-list"
        ? section.name
        : sectionMeta.messageLabel || sectionMeta.summaryLabel || section.name;
    lines.push("");
    lines.push(`*${sanitizeMessageText(sectionLabel)}*`);

    if (section.type === "letters") {
      section.groupedBySize.forEach((group) => {
        lines.push("");
        lines.push(`${group.size}mm`);
        group.items.forEach((item) => {
          lines.push(`- ${item.letter}: ${item.qty}`);
        });
      });
      return;
    }

    if (section.type === "kits") {
      section.families.forEach((family, index) => {
        lines.push(`${sanitizeMessageText(family.name)}`);
        family.breakdown.forEach((item) => {
          lines.push(`- ${sanitizeMessageText(item.name)}: ${item.qty}`);
        });

        if (index < section.families.length - 1) {
          lines.push("");
        }
      });
      return;
    }

    if (section.type === "price-list") {
      section.products.forEach((product) => {
        lines.push(`${sanitizeMessageText(product.name)}`);
        lines.push(...(catalogAdapter?.buildOrderLines?.(product, product.qty) || [`- Cantidad: ${product.qty}`]));
      });
      return;
    }

    section.families.forEach((family, index) => {
      if (family.type === "grupo-placa") {
        lines.push(`${sanitizeMessageText(family.name)}`);
        family.variants.forEach((variant) => {
          const copiesLabel = variant.multiplier === 1 ? "1 copia" : `${variant.multiplier} copias`;
          lines.push(`- Placa ${variant.plateLabel} (${copiesLabel})`);
          variant.breakdown.forEach((item) => {
            lines.push(`  - ${sanitizeMessageText(item.name)}: ${item.totalPlates} placas`);
          });
        });
      } else if (family.type === "grupo") {
        lines.push(`${sanitizeMessageText(family.name)}`);
        const copiesLabel = family.multiplier === 1 ? "1 copia" : `${family.multiplier} copias`;
        if (family.plateReference) {
          lines.push(`- Placa ${family.plateReference} (${copiesLabel})`);
        } else {
          lines.push(`- ${copiesLabel}`);
        }
      } else {
        lines.push(`${sanitizeMessageText(family.name)}`);
      }

      if (family.breakdown) {
        family.breakdown.forEach((item) => {
          lines.push(
            family.type === "grupo"
              ? `  - ${sanitizeMessageText(item.name)}: ${item.totalPlates} placas`
              : `- ${sanitizeMessageText(item.name)}: ${item.totalPlates} placas`
          );
        });
      }

      if (index < section.families.length - 1) {
        lines.push("");
      }
    });

  });

  lines.push("");
  lines.push("RESUMEN FINAL");
  data.sections.forEach((section) => {
    lines.push(`*Total ${sanitizeMessageText(section.name)}: ${formatSectionSummaryValue(section, data)}*`);
  });
  lines.push("");
  lines.push(`*Total general: ${formatGrandTotal(data)}*`);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.formatOrderMessage = formatOrderMessage;
})();
