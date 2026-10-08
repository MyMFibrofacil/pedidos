/** Coordina la preparación y el envío del pedido por correo o WhatsApp. */
(() => {
  function createOrderSender(dependencies) {
    const {
      clientConfig, clientKey, html, buildMessage, buildOrderData,
      setStatus, onEmailSubmissionState,
    } = dependencies;
    const buildWhatsAppText = buildMessage;
    const buildXubioOrderData = buildOrderData;
  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_error) {
      // Fallback below.
    }
  
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
  
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_error) {
      copied = false;
    }
  
    document.body.removeChild(textarea);
    return copied;
  }
  
  function getSendMode() {
    if (clientConfig?.sendMode === "form-post-email") return "form-post-email";
    if (clientConfig?.sendMode === "direct-email") return "direct-email";
    if (clientConfig?.sendMode === "email") return "email";
    return "whatsapp";
  }
  
  function getOrderDateLabel() {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }
  
  function getEmailSubject() {
    const explicitSubject = String(clientConfig?.emailSubject || "").trim();
    if (explicitSubject) return explicitSubject;
  
    const subjectPrefix = String(clientConfig?.emailSubjectPrefix || `Pedido ${clientConfig?.name || ""}`.trim() || "Pedido");
    return `${subjectPrefix} - ${getOrderDateLabel()}`;
  }
  
  function buildEmailLink(text) {
    const recipient = String(clientConfig?.emailTo || "").trim();
    const params = new URLSearchParams({
      subject: getEmailSubject(),
      body: text,
    });
    return `mailto:${recipient}?${params.toString()}`;
  }
  
  async function sendDirectEmail(text) {
    const endpoint = String(clientConfig?.sendEndpoint || "").trim();
    if (!endpoint) {
      throw new Error("Falta configurar el endpoint de envio de mail.");
    }
  
    const payload = JSON.stringify({
      from: "mymfibrofacil.web@gmail.com",
      to: String(clientConfig?.emailTo || "").trim(),
      subject: getEmailSubject(),
      body: text,
      clientKey,
      clientName: clientConfig?.name || "",
      createdAt: new Date().toISOString(),
    });
  
    if (navigator.sendBeacon) {
      const queued = navigator.sendBeacon(
        endpoint,
        new Blob([payload], { type: "text/plain;charset=UTF-8" })
      );
      if (queued) return;
    }
  
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: payload,
      keepalive: true,
    });
  }
  
  function submitEmailForm(text) {
    if (!html.emailForm) {
      throw new Error("No se encontro el formulario de envio.");
    }
  
    const endpoint = String(clientConfig?.sendEndpoint || "").trim();
    if (!endpoint) {
      throw new Error("Falta configurar el endpoint de envio de mail.");
    }
  
    html.emailForm.action = endpoint;
  
    const assignValue = (name, value) => {
      const field = html.emailForm.elements.namedItem(name);
      if (!field) return;
      field.value = value;
    };
  
    assignValue("from", "mymfibrofacil.web@gmail.com");
    assignValue("to", String(clientConfig?.emailTo || "").trim());
    assignValue("subject", getEmailSubject());
    assignValue("body", text);
    assignValue("client_key", clientKey);
    assignValue("client_name", clientConfig?.name || "");
    assignValue("created_at", new Date().toISOString());
    if (clientConfig?.sendXubioOrder !== false) {
      assignValue("order_data", JSON.stringify(buildXubioOrderData()));
    }
  
    html.emailForm.submit();
  }
  
  async function sendOrder() {
    const text = buildWhatsAppText();
    const copied = await copyText(text);
    const sendMode = getSendMode();
  
    if (sendMode === "form-post-email") {
      try {
        onEmailSubmissionState(true, copied
          ? "Pedido enviado por mail y copiado al portapapeles."
          : "Pedido enviado por mail.");
        setStatus("Enviando pedido por mail...");
        submitEmailForm(text);
      } catch (error) {
        onEmailSubmissionState(false, "");
        const detail = error instanceof Error ? error.message : "No se pudo enviar el pedido por mail.";
        setStatus(detail, "error");
      }
      return;
    }
  
    if (sendMode === "direct-email") {
      try {
        await sendDirectEmail(text);
        setStatus(
          copied
            ? "Pedido enviado por mail y copiado al portapapeles."
            : "Pedido enviado por mail.",
          "success"
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : "No se pudo enviar el pedido por mail.";
        setStatus(detail, "error");
      }
      return;
    }
  
    if (sendMode === "email") {
      window.location.href = buildEmailLink(text);
  
      if (copied) {
        setStatus("Pedido copiado. Se abrio tu correo con el pedido precargado.", "success");
      } else {
        setStatus("Se abrio tu correo. Si no aparece el texto, copialo desde el resumen.", "error");
      }
      return;
    }
  
    const encodedText = encodeURIComponent(text);
    const deepLink = `whatsapp://send?text=${encodedText}`;
    const webLink = `https://api.whatsapp.com/send?text=${encodedText}`;
  
    window.open(deepLink, "_blank");
    setTimeout(() => {
      window.open(webLink, "_blank");
    }, 400);
  
    if (copied) {
      setStatus("Pedido copiado. Elegi el grupo en WhatsApp y envia el mensaje.", "success");
    } else {
      setStatus("WhatsApp se abrio con el pedido. Si no aparece el texto, copialo desde el resumen.", "error");
    }
  }
    return { sendOrder, submitEmailForm };
  }

  window.PedidosApp = window.PedidosApp || {};
  window.PedidosApp.createOrderSender = createOrderSender;
})();
