/** Presenta la grilla de caracteres y los controles de carga rápida. */
(() => {
  function createLettersRenderer(dependencies) {
    const {
      html, clientConfig, lettersConfig, letterState, escapeHtml,
      getFilteredLetters, getLetterTotal, getActiveLetterFilterLabel,
    } = dependencies;
  function renderQuickStepButtons() {
    if (clientConfig?.hideQuantitySteps) return "";
    return lettersConfig.quickSteps
      .map((step) => {
        const active = step === letterState.step;
        return `
          <button
            type="button"
            data-letter-step="${escapeHtml(step)}"
            class="shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${
              active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
            }"
          >
            ${escapeHtml(step)} en ${escapeHtml(step)}
          </button>
        `;
      })
      .join("");
  }
  
  function renderLettersSection() {
    const filteredLetters = getFilteredLetters();
    const activeFilterLabel = getActiveLetterFilterLabel(filteredLetters.length);
  
    const steps = renderQuickStepButtons();
  
    const filters = lettersConfig.filters
      .map((filter) => {
        const active = filter.id === letterState.filter;
        return `
          <button
            type="button"
            data-letter-filter="${escapeHtml(filter.id)}"
            class="shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${
              active ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700"
            }"
          >
            ${escapeHtml(filter.label)}
          </button>
        `;
      })
      .join("");
  
    const cards =
      filteredLetters.length > 0
        ? filteredLetters
            .map((letter) => {
              const total = getLetterTotal(letter);
              return `
                <article class="rounded-3xl border ${
                  total > 0 ? "border-primary/25 bg-white" : "border-slate-200 bg-white"
                } p-2 shadow-sm">
                  <div class="mb-2 flex items-start justify-between gap-1">
                    <h3 class="text-[1.7rem] font-extrabold leading-none text-slate-900">${escapeHtml(letter)}</h3>
                    <span class="min-w-7 rounded-full px-2 py-0.5 text-center text-[10px] font-extrabold ${
                      total > 0 ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                    }">${total}</span>
                  </div>
                  <div class="space-y-1.5">
                    ${lettersConfig.sizes
                      .map((size) => {
                        const qty = letterState.quantities[letter]?.[size] || 0;
                        return `
                          <div class="rounded-2xl bg-slate-50 px-1 py-1">
                            <div class="grid grid-cols-[0.9rem_1.5rem_minmax(0,1fr)_1.5rem] items-center gap-0.5">
                              <span class="text-[9px] font-extrabold text-slate-500">${escapeHtml(size)}</span>
                              <button
                                type="button"
                                data-letter-action="decrease"
                                data-letter="${escapeHtml(letter)}"
                                data-letter-size="${escapeHtml(size)}"
                                class="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm active:scale-95"
                              >
                                <span class="material-symbols-outlined text-[15px]">remove</span>
                              </button>
                              <input
                                type="number"
                                min="0"
                                inputmode="numeric"
                                value="${qty}"
                                data-letter-input="${escapeHtml(letter)}"
                                data-letter-size="${escapeHtml(size)}"
                                class="h-6 min-w-0 w-full rounded-lg border-0 bg-white px-0 text-center text-[11px] font-extrabold text-slate-900 focus:ring-0"
                              />
                              <button
                                type="button"
                                data-letter-action="increase"
                                data-letter="${escapeHtml(letter)}"
                                data-letter-size="${escapeHtml(size)}"
                                class="flex h-6 w-6 items-center justify-center rounded-lg ${
                                  qty > 0 ? "bg-primary text-white" : "bg-white text-primary"
                                } shadow-sm active:scale-95"
                              >
                                <span class="material-symbols-outlined text-[15px]">add</span>
                              </button>
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </article>
              `;
            })
            .join("")
        : `
          <div class="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No hay ${escapeHtml(getActiveLetterFilterLabel(2))} en esta vista.
          </div>
        `;
  
    html.families.innerHTML = `
      <section class="space-y-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Carga rapida</p>
              <p class="text-sm font-semibold text-slate-800">${escapeHtml(lettersConfig.materialLabel)}</p>
            </div>
            <p class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Paso ${escapeHtml(letterState.step)}
            </p>
          </div>
          <div class="flex gap-2 overflow-x-auto scrollbar-hide">${steps}</div>
          <div class="flex gap-2 overflow-x-auto scrollbar-hide">${filters}</div>
          <button
            type="button"
            data-category-clear="active"
            class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            Limpiar categoria
          </button>
        </div>
        <div class="flex items-center justify-between gap-3 px-1">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Grilla movil</p>
            <p class="text-xs font-semibold text-slate-700">3 por fila con 22, 27 y 33 mm</p>
          </div>
          <p class="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            ${filteredLetters.length} ${escapeHtml(activeFilterLabel)}
          </p>
        </div>
        <div class="grid grid-cols-3 gap-2">${cards}</div>
      </section>
    `;
  
    html.empty.classList.add("hidden");
  }
    return {
      renderQuickStepButtons,
      renderLettersSection,
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createLettersRenderer = createLettersRenderer;
})();
