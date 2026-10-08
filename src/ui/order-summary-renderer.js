/** Renderiza el resumen del pedido y su panel de detalle. */
(() => {
  function renderOrderSummary({
    data, availableSections, clientConfig, summaryMode, summaryOpen, html, catalogAdapter,
    escapeHtml, formatCurrency, formatGrandTotal, formatSectionSummaryValue,
    formatSectionCount, getThickness,
  }) {
    let isOpen = summaryOpen;
    if (html.summaryTotals) {
      const summarySections = availableSections.filter((section) => {
        if (!clientConfig?.hideEmptySummarySections) return true;
        const value = data.totalsByValue[section.id] || 0;
        const count = data.totalsByThickness[section.id] || 0;
        return summaryMode === "value" ? value > 0 : count > 0;
      });
  
      const totalsMarkup = summarySections
        .map((section) => {
          const count = data.totalsByThickness[section.id] || 0;
          const value = data.totalsByValue[section.id] || 0;
          const renderedValue =
            summaryMode === "value"
              ? formatCurrency(value)
              : formatSectionCount(section.id, count);
          return `
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-bold text-slate-700">Total ${escapeHtml(section.summaryLabel || section.name || getThickness(section.id).summaryLabel || getThickness(section.id).label)}:</p>
              <p class="text-sm font-bold text-slate-700 shrink-0">${escapeHtml(renderedValue)}</p>
            </div>
          `;
        })
        .join("");
  
      const grandTotalMarkup = `
        <div class="mt-2 border-t border-slate-200 pt-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-extrabold text-primary">Total general:</p>
            <p class="text-sm font-extrabold text-primary shrink-0">${escapeHtml(formatGrandTotal(data))}</p>
          </div>
        </div>
      `;
  
      html.summaryTotals.innerHTML = `${totalsMarkup}${grandTotalMarkup}`;
    }
  
    html.sendButton.disabled = data.totalCount === 0;
  
    if (data.sections.length === 0) {
      html.summaryDetailsList.innerHTML =
        '<p class="p-4 text-sm text-slate-500">Todavia no agregaste items al pedido.</p>';
      isOpen = false;
    } else {
      const sectionsMarkup = data.sections
        .map((section) => {
          if (section.type === "letters") {
            return `
              <div class="border-b border-slate-200 last:border-b-0">
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(section.name)}</p>
                </div>
                <div class="p-4 space-y-3">
                  ${section.groupedBySize
                    .map((group) => {
                      return `
                        <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <div class="px-3 py-2 bg-slate-50 border-b border-slate-200">
                            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(group.size)}mm</p>
                          </div>
                          <div class="px-3 py-3 space-y-2">
                            ${group.items
                              .map((item) => {
                                return `
                                  <div class="flex items-start justify-between gap-3 text-sm">
                                    <p class="font-semibold text-slate-700">- ${escapeHtml(item.letter)}:</p>
                                    <p class="font-semibold text-slate-900 shrink-0">${item.qty}</p>
                                  </div>
                                `;
                              })
                              .join("")}
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `;
          }
  
          if (section.type === "price-list") {
            return `
              <div class="border-b border-slate-200 last:border-b-0">
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(section.name)}</p>
                </div>
                <div class="p-4 space-y-3">
                  <div class="space-y-2">
                    ${section.products
                      .map((product) => {
                        return `
                          <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <p class="text-sm font-semibold text-slate-800">${escapeHtml(product.name)}</p>
                            <p class="mt-1 text-xs text-slate-500">${escapeHtml(catalogAdapter?.describeSelection?.(product, product.qty) || `- Cantidad: ${product.qty}`)}</p>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              </div>
            `;
          }
  
          if (section.type === "kits") {
            return `
              <div class="border-b border-slate-200 last:border-b-0">
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(section.name)}</p>
                </div>
                <div class="divide-y divide-slate-100">
                  ${section.families
                    .map((family) => {
                      return `
                        <div class="p-4 space-y-2">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-sm font-semibold text-slate-800">${escapeHtml(family.name)}</p>
                            <p class="text-sm font-bold text-primary shrink-0">${escapeHtml(formatCurrency(family.totalValue))}</p>
                          </div>
                          <div class="space-y-1">
                            ${family.breakdown
                              .map((item) => {
                                return `
                                  <div class="flex items-start justify-between gap-3 text-xs">
                                    <p class="text-slate-500 min-w-0">${escapeHtml(`${item.name} x${item.qty}`)}</p>
                                    <p class="text-slate-700 shrink-0">${escapeHtml(formatCurrency(item.subtotal))}</p>
                                  </div>
                                `;
                              })
                              .join("")}
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `;
          }
  
          return `
            <div class="border-b border-slate-200 last:border-b-0">
              <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">${escapeHtml(section.name)}</p>
              </div>
              <div class="divide-y divide-slate-100">
                ${section.families
                  .map((family) => {
                    const multiplierLabel =
                      family.type === "grupo"
                        ? `<p class="text-xs text-slate-500">${family.multiplier}x familia</p>`
                        : "";
                    const plateReferenceLabel =
                      family.type === "grupo" && family.plateReference
                        ? `<p class="text-xs text-slate-500">Placa de referencia: ${escapeHtml(family.plateReference)}</p>`
                        : "";
                    const variantMarkup =
                      family.type === "grupo-placa"
                        ? `
                          <div class="space-y-3">
                            ${family.variants
                              .map((variant) => {
                                return `
                                  <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                    <div class="flex items-start justify-between gap-3">
                                      <div class="min-w-0">
                                        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Placa ${escapeHtml(variant.plateLabel)}</p>
                                        <p class="mt-1 text-xs text-slate-500">${variant.multiplier}x variante</p>
                                      </div>
                                      <p class="text-sm font-bold text-primary shrink-0">${formatSectionCount(section.id, variant.totalPlates)}</p>
                                    </div>
                                    <div class="mt-2 space-y-1">
                                      ${variant.breakdown
                                        .map((item) => {
                                          return `
                                            <div class="flex items-start justify-between gap-3 text-xs">
                                              <p class="text-slate-500 min-w-0">${escapeHtml(item.name)}</p>
                                              <p class="text-slate-700 shrink-0">${item.totalPlates}</p>
                                            </div>
                                          `;
                                        })
                                        .join("")}
                                    </div>
                                  </div>
                                `;
                              })
                              .join("")}
                          </div>
                        `
                        : "";
  
                    return `
                      <div class="p-4 space-y-2">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <p class="text-sm font-semibold text-slate-800">${escapeHtml(family.name)}</p>
                            ${multiplierLabel}
                            ${plateReferenceLabel}
                          </div>
                          <p class="text-sm font-bold text-primary shrink-0">${formatSectionCount(section.id, family.totalPlates)}</p>
                        </div>
                        ${
                          family.type === "grupo-placa"
                            ? variantMarkup
                            : `<div class="space-y-1">
                                ${family.breakdown
                                  .map((item) => {
                                    return `
                                      <div class="flex items-start justify-between gap-3 text-xs">
                                        <p class="text-slate-500 min-w-0">${escapeHtml(item.name)}</p>
                                        <p class="text-slate-700 shrink-0">${item.totalPlates}</p>
                                      </div>
                                    `;
                                  })
                                  .join("")}
                              </div>`
                        }
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("");
  
      const grandTotalDetailsMarkup = `
        <div class="px-4 py-4 bg-slate-50">
          <div class="rounded-xl border border-primary/15 bg-white overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Resumen final</p>
            </div>
            <div class="px-4 py-3 space-y-2">
              ${data.sections
                .map((section) => {
                  return `
                    <div class="flex items-center justify-between gap-3 text-sm">
                      <p class="font-bold text-slate-700">Total ${escapeHtml(section.name)}:</p>
                      <p class="font-bold text-slate-900 shrink-0">${escapeHtml(formatSectionSummaryValue(section, data))}</p>
                    </div>
                  `;
                })
                .join("")}
              <div class="border-t border-slate-200 pt-2">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <p class="font-extrabold text-primary">Total general:</p>
                  <p class="font-extrabold text-primary">${escapeHtml(formatGrandTotal(data))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
  
      html.summaryDetailsList.innerHTML = `${sectionsMarkup}${grandTotalDetailsMarkup}`;
    }
  
    html.summaryDetailsPanel.classList.toggle("hidden", !isOpen);
    html.summaryChevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    return isOpen;
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.renderOrderSummary = renderOrderSummary;
})();
