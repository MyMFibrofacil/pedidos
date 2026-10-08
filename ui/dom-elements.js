(() => {
function getDomElements() {
  return {
    catalogScroll: document.getElementById("catalog-scroll"),
    closeDesigns: document.getElementById("close-designs"),
    designsModal: document.getElementById("designs-modal"),
    emailForm: document.getElementById("email-send-form"),
    emailFrame: document.getElementById("email-send-target"),
    empty: document.getElementById("empty-state"),
    families: document.getElementById("families-container"),
    logo: document.getElementById("app-logo"),
    openDesigns: document.getElementById("open-designs"),
    scrollToBottom: document.getElementById("scroll-to-bottom"),
    search: document.getElementById("search-input"),
    searchWrapper: document.getElementById("search-wrapper"),
    sendButton: document.getElementById("send-whatsapp"),
    sendButtonLabel: document.getElementById("send-button-label"),
    status: document.getElementById("status-message"),
    summaryChevron: document.getElementById("summary-chevron"),
    summaryDetailsList: document.getElementById("summary-details-list"),
    summaryDetailsPanel: document.getElementById("summary-details-panel"),
    summaryTitle: document.getElementById("summary-title"),
    summaryToggle: document.getElementById("summary-toggle"),
    summaryTotals: document.getElementById("summary-totals"),
    tabs: document.getElementById("thickness-tabs"),
    toast: document.getElementById("status-toast"),
  };
}

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.getDomElements = getDomElements;
})();
