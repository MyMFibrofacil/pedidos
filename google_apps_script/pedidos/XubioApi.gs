function getXubioToken() {
  const properties = PropertiesService.getScriptProperties();
  const clientId = String(properties.getProperty("XUBIO_CLIENT_ID") || "").trim();
  const clientSecret = String(properties.getProperty("XUBIO_CLIENT_SECRET") || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("Faltan XUBIO_CLIENT_ID o XUBIO_CLIENT_SECRET en las propiedades del Script.");
  }

  const response = UrlFetchApp.fetch(XUBIO.tokenUrl, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: "grant_type=client_credentials",
    headers: { Authorization: `Basic ${Utilities.base64Encode(`${clientId}:${clientSecret}`)}` },
    muteHttpExceptions: true,
  });
  const data = parseXubioResponse(response, "obtener el token");
  if (!data.access_token) throw new Error("Xubio no devolvio access_token.");
  return data.access_token;
}
function xubioFetchJson(url, token, method, payload) {
  const options = {
    method,
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    muteHttpExceptions: true,
  };
  if (payload !== undefined) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }
  return parseXubioResponse(UrlFetchApp.fetch(url, options), "comunicarse con Xubio");
}
function parseXubioResponse(response, action) {
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error(`Xubio no pudo ${action} (HTTP ${status}): ${text}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    throw new Error(`Xubio devolvio una respuesta no valida al ${action}.`);
  }
}
