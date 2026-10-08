/** Controla mensajes, diálogos y ayudas visuales de la pantalla. */
(() => {
  function createScreenFeedback({ html, clientConfig, assetPrefix, escapeHtml }) {
    let statusTimer = null;
    let toastTimer = null;
    let scrollButtonTimer = null;

    function applyClientUi() {
      if (!clientConfig) return;
      const ui = clientConfig.ui || {};
      document.title = ui.title || `Pedidos ${clientConfig.name || ""}`.trim() || "Pedidos";
      if (html.search && ui.searchPlaceholder) html.search.placeholder = ui.searchPlaceholder;
      if (html.summaryTitle && ui.detailTitle) html.summaryTitle.textContent = ui.detailTitle;
      if (html.sendButtonLabel && ui.sendButtonLabel) html.sendButtonLabel.textContent = ui.sendButtonLabel;
      if (html.logo && clientConfig.logoPath) html.logo.src = `${assetPrefix}${clientConfig.logoPath}`;
    }

    function updateSearchVisibility(isLettersSection) {
      if (html.searchWrapper) html.searchWrapper.classList.toggle("hidden", isLettersSection);
    }

    function setFamiliesMessage(message) {
      html.families.innerHTML = `<p class="text-sm text-slate-500">${escapeHtml(message)}</p>`;
    }

    function openDesignsModal() {
      if (!html.designsModal) return;
      html.designsModal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    }

    function closeDesignsModal() {
      if (!html.designsModal) return;
      html.designsModal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }

    function hideToast() {
      if (!html.toast) return;
      html.toast.classList.add("opacity-0", "-translate-y-3");
      html.toast.classList.remove("opacity-100", "translate-y-0");
      setTimeout(() => {
        if (!html.toast.classList.contains("opacity-100")) html.toast.classList.add("hidden");
      }, 300);
    }

    function showToast(message, tone = "muted") {
      if (!html.toast || !message || tone === "muted") return;
      if (toastTimer) clearTimeout(toastTimer);
      html.toast.textContent = message;
      html.toast.className = "pointer-events-none fixed left-1/2 top-5 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-bold shadow-xl opacity-0 -translate-y-3 transition-all duration-300";
      const tones = {
        success: ["border", "border-emerald-200", "bg-emerald-50", "text-emerald-700", "shadow-emerald-900/10"],
        error: ["border", "border-red-200", "bg-red-50", "text-red-700", "shadow-red-900/10"],
      };
      html.toast.classList.add(...(tones[tone] || []));
      html.toast.classList.remove("hidden");
      requestAnimationFrame(() => {
        html.toast.classList.remove("opacity-0", "-translate-y-3");
        html.toast.classList.add("opacity-100", "translate-y-0");
      });
      toastTimer = setTimeout(hideToast, 2600);
    }

    function setStatus(message, tone = "muted") {
      if (!html.status) return;
      if (statusTimer) clearTimeout(statusTimer);
      html.status.textContent = message || "";
      html.status.className = "px-2 text-xs min-h-4";
      html.status.classList.add(tone === "success" ? "text-emerald-600" : tone === "error" ? "text-red-600" : "text-slate-500");
      if (!message) {
        if (toastTimer) clearTimeout(toastTimer);
        hideToast();
      } else {
        showToast(message, tone);
      }
      if (message) {
        statusTimer = setTimeout(() => {
          html.status.textContent = "";
          html.status.className = "px-2 text-xs text-slate-500 min-h-4";
        }, 5000);
      }
    }

    function getRemainingScroll() {
      if (!html.catalogScroll) return 0;
      const scrollable = html.catalogScroll.scrollHeight - html.catalogScroll.clientHeight > 1;
      const remainingContainer = html.catalogScroll.scrollHeight - html.catalogScroll.scrollTop - html.catalogScroll.clientHeight;
      const remainingWindow = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)
        - (window.scrollY + window.innerHeight);
      return scrollable ? remainingContainer : remainingWindow;
    }

    function hideScrollButton() {
      if (html.scrollToBottom) html.scrollToBottom.classList.add("hidden");
    }

    function showScrollButtonTemporarily() {
      if (!html.scrollToBottom) return;
      if (getRemainingScroll() < 24) {
        hideScrollButton();
        return;
      }
      html.scrollToBottom.classList.remove("hidden");
      if (scrollButtonTimer) clearTimeout(scrollButtonTimer);
      scrollButtonTimer = setTimeout(hideScrollButton, 1400);
    }

    return {
      applyClientUi, updateSearchVisibility, setFamiliesMessage,
      openDesignsModal, closeDesignsModal, setStatus,
      getRemainingScroll, hideScrollButton, showScrollButtonTemporarily,
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createScreenFeedback = createScreenFeedback;
})();
