/** Administra filtros, cantidades y totales de la sección de letras. */
(() => {
  const LETTER_VOWELS = new Set(["A", "E", "I", "O", "U"]);

  function createLettersManager({ lettersConfig, letterState, normalizeQty, onChange, setStatus }) {
    function getLetterTotal(letter) {
      return lettersConfig.sizes.reduce(
        (sum, size) => sum + (letterState.quantities[letter]?.[size] || 0),
        0
      );
    }

    function isNumericLetter(value) {
      return /^\d+$/.test(String(value || ""));
    }

    function getActiveLetterFilter() {
      return lettersConfig.filters.find((filter) => filter.id === letterState.filter)
        || lettersConfig.filters[0]
        || null;
    }

    function getActiveLetterFilterMode() {
      return getActiveLetterFilter()?.mode || getActiveLetterFilter()?.id || "letters";
    }

    function getActiveLetterFilterLabel(count) {
      const mode = getActiveLetterFilterMode();
      if (mode === "numbers") return count === 1 ? "número" : "números";
      if (mode === "letters") return count === 1 ? "letra" : "letras";
      return count === 1 ? "carácter" : "caracteres";
    }

    function getFilteredLetters() {
      return lettersConfig.letters.filter((letter) => {
        const mode = getActiveLetterFilterMode();
        if (mode === "numbers") return isNumericLetter(letter);
        if (mode === "letters") return !isNumericLetter(letter);
        if (letterState.filter === "vowels") return LETTER_VOWELS.has(letter);
        if (letterState.filter === "consonants") return !LETTER_VOWELS.has(letter);
        if (letterState.filter === "loaded") return getLetterTotal(letter) > 0;
        return true;
      });
    }

    function setLetterQty(letter, size, value) {
      if (!letterState.quantities[letter]) letterState.quantities[letter] = {};
      letterState.quantities[letter][size] = normalizeQty(value);
      onChange();
    }

    function updateLetterQty(letter, size, delta) {
      const current = letterState.quantities[letter]?.[size] || 0;
      setLetterQty(letter, size, Math.max(0, current + delta));
    }

    function clearAllQuantities() {
      lettersConfig.letters.forEach((letter) => {
        lettersConfig.sizes.forEach((size) => { letterState.quantities[letter][size] = 0; });
      });
    }

    function clearLoadedLetters() {
      lettersConfig.letters.forEach((letter) => {
        if (getLetterTotal(letter) <= 0) return;
        lettersConfig.sizes.forEach((size) => { letterState.quantities[letter][size] = 0; });
      });
      setStatus("Se limpiaron los caracteres cargados.");
      onChange();
    }

    function clearAllLetters() {
      clearAllQuantities();
      setStatus("Se limpiaron todos los caracteres.");
      onChange();
    }

    function summarizeLettersSection() {
      const lines = lettersConfig.letters.map((letter) => {
        const perSize = lettersConfig.sizes.map((size) => ({
          size,
          qty: letterState.quantities[letter]?.[size] || 0,
          unitPrice: letterState.prices[size] || 0,
        })).filter((item) => item.qty > 0);
        if (perSize.length === 0) return null;
        return {
          letter,
          perSize,
          total: perSize.reduce((sum, item) => sum + item.qty, 0),
          subtotal: perSize.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
        };
      }).filter(Boolean);

      const sizeTotals = Object.fromEntries(lettersConfig.sizes.map((size) => [
        size,
        lettersConfig.letters.reduce((sum, letter) => sum + (letterState.quantities[letter]?.[size] || 0), 0),
      ]));
      const sizeSubtotals = Object.fromEntries(lettersConfig.sizes.map((size) => [
        size,
        (letterState.prices[size] || 0) * (sizeTotals[size] || 0),
      ]));
      const subtotal = Object.values(sizeSubtotals).reduce((sum, value) => sum + value, 0);
      const tax = subtotal * lettersConfig.taxRate;
      const groupedBySize = lettersConfig.sizes.map((size) => ({
        size,
        items: lettersConfig.letters.map((letter) => ({
          letter,
          qty: letterState.quantities[letter]?.[size] || 0,
        })).filter((item) => item.qty > 0),
      })).filter((group) => group.items.length > 0);

      return {
        lines, groupedBySize, sizeTotals, sizeSubtotals,
        total: Object.values(sizeTotals).reduce((sum, qty) => sum + qty, 0),
        subtotal, tax, totalWithTax: subtotal + tax,
      };
    }

    return {
      getLetterTotal, getActiveLetterFilterLabel, getFilteredLetters,
      setLetterQty, updateLetterQty, clearAllQuantities, clearLoadedLetters,
      clearAllLetters, summarizeLettersSection,
    };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createLettersManager = createLettersManager;
})();
