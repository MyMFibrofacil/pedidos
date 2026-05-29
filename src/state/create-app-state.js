(() => {
function createAppState(thicknessMeta, lettersConfig) {
  return {
    activeThickness: Object.keys(thicknessMeta)[0] || "3",
    catalog: [],
    emailSubmissionPending: false,
    familyQuantities: {},
    kitGroupOpenState: {},
    letterState: {
      step: lettersConfig.quickSteps[0] || 1,
      filter: lettersConfig.filters[0]?.id || "all",
      prices: Object.fromEntries(lettersConfig.sizes.map((size) => [size, 0])),
      quantities: Object.fromEntries(
        lettersConfig.letters.map((letter) => [
          letter,
          Object.fromEntries(lettersConfig.sizes.map((size) => [size, 0])),
        ])
      ),
    },
    materialQuantities: {},
    pendingEmailStatusMessage: "",
    productQuantities: {},
    scrollButtonTimer: null,
    searchTerm: "",
    statusTimer: null,
    summaryOpen: false,
    toastTimer: null,
    variantQuantities: {},
  };
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createAppState = createAppState;
})();
