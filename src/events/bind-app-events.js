/** Enlaza los eventos de la pantalla con las acciones del controlador. */
(() => {
  function bindAppEvents({ html, actions }) {
    html.tabs.addEventListener("click", (event) => {
      const home = event.target.closest("[data-category-home]");
      if (home) {
        actions.openCategoryHome();
        return;
      }
      const tab = event.target.closest("[data-thickness]");
      if (tab) actions.selectSection(tab.dataset.thickness);
    });

    html.families.addEventListener("click", (event) => {
      if (event.target.closest("[data-order-clear]")) {
        actions.clearOrder();
        return;
      }
      if (event.target.closest("[data-category-home]")) {
        actions.openCategoryHome();
        return;
      }
      const category = event.target.closest("[data-category-select][data-category-section]");
      if (category) {
        actions.selectCategory(category.dataset.categorySection, category.dataset.categorySelect);
        return;
      }
      const family = event.target.closest("[data-family]");
      if (family) {
        actions.toggleFamily(family.dataset.family);
        return;
      }
      const kitGroup = event.target.closest("[data-kit-group-toggle]");
      if (kitGroup) {
        actions.toggleKitGroup(kitGroup.dataset.kitGroupToggle);
        return;
      }

      const familyQty = event.target.closest("[data-family-action][data-family-qty]");
      if (familyQty) {
        actions.adjustFamily(familyQty.dataset.familyQty, familyQty.dataset.familyAction);
        return;
      }
      const variantQty = event.target.closest("[data-variant-action][data-variant]");
      if (variantQty) {
        actions.adjustVariant(variantQty.dataset.variant, variantQty.dataset.variantAction);
        return;
      }
      const materialQty = event.target.closest("[data-material-action][data-material]");
      if (materialQty) {
        actions.adjustMaterial(materialQty.dataset.material, materialQty.dataset.materialAction);
        return;
      }
      const productQty = event.target.closest("[data-product-action][data-product]");
      if (productQty) {
        actions.adjustProduct(productQty.dataset.product, productQty.dataset.productAction);
        return;
      }

      const letterStep = event.target.closest("[data-letter-step]");
      if (letterStep) {
        actions.setLetterStep(letterStep.dataset.letterStep);
        return;
      }
      const letterFilter = event.target.closest("[data-letter-filter]");
      if (letterFilter) {
        actions.setLetterFilter(letterFilter.dataset.letterFilter);
        return;
      }
      const letter = event.target.closest("[data-letter-action][data-letter][data-letter-size]");
      if (letter) {
        actions.adjustLetter(letter.dataset.letter, letter.dataset.letterSize, letter.dataset.letterAction);
        return;
      }
      if (event.target.closest("[data-category-clear]")) actions.clearSection();
    });

    html.families.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches("[data-family-input]")) {
        actions.setFamilyQty(target.dataset.familyInput, target.value);
      } else if (target.matches("[data-variant-input]")) {
        actions.setVariantQty(target.dataset.variantInput, target.value);
      } else if (target.matches("[data-product-input]")) {
        actions.setProductQty(target.dataset.productInput, target.value);
      } else if (target.matches("[data-material-input]")) {
        actions.setMaterialQty(target.dataset.materialInput, target.value);
      } else if (target.matches("[data-letter-input][data-letter-size]")) {
        actions.setLetterQty(target.dataset.letterInput, target.dataset.letterSize, target.value);
      }
    });

    html.search.addEventListener("input", (event) => actions.search(event.target.value));
    html.summaryToggle.addEventListener("click", actions.toggleSummary);
    html.sendButton.addEventListener("click", actions.sendOrder);

    if (html.emailFrame) html.emailFrame.addEventListener("load", actions.emailFrameLoaded);
    if (html.openDesigns) html.openDesigns.addEventListener("click", actions.openDesigns);
    if (html.closeDesigns) html.closeDesigns.addEventListener("click", actions.closeDesigns);
    if (html.designsModal) {
      html.designsModal.addEventListener("click", (event) => {
        if (event.target === html.designsModal) actions.closeDesigns();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && html.designsModal && !html.designsModal.classList.contains("hidden")) {
        actions.closeDesigns();
      }
    });

    if (html.scrollToBottom && html.catalogScroll) {
      html.scrollToBottom.addEventListener("click", () => {
        html.catalogScroll.scrollTo({ top: html.catalogScroll.scrollHeight, behavior: "smooth" });
        if (html.sendButton) html.sendButton.scrollIntoView({ behavior: "smooth", block: "end" });
      });
      html.catalogScroll.addEventListener("scroll", actions.showScrollButton, { passive: true });
      window.addEventListener("scroll", actions.showScrollButton, { passive: true });
      window.addEventListener("resize", actions.updateScrollButton, { passive: true });
      actions.hideScrollButton();
    }
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.bindAppEvents = bindAppEvents;
})();
