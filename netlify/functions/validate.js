const crypto = require("crypto");

function baseUrlFromEvent(event) {
  if (process.env.URL) return process.env.URL;
  const proto = event.headers["x-forwarded-proto"] || "http";
  const host = event.headers.host;
  return `${proto}://${host}`;
}

function b64url(str) {
  return Buffer.from(str).toString("base64url");
}

function sign(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

exports.handler = async (event) => {
  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET;

    if (!MP_ACCESS_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };
    if (!DOWNLOAD_SECRET) return { statusCode: 500, body: JSON.stringify({ error: "Falta DOWNLOAD_SECRET" }) };

    const BOOK_PRICE = Number(process.env.BOOK_PRICE || "9900");
    const BOOK_CURRENCY = (process.env.BOOK_CURRENCY || "ARS").toUpperCase();

    const payment_id = (event.queryStringParameters?.payment_id || "").trim();
    if (!payment_id) return { statusCode: 400, body: JSON.stringify({ error: "Falta payment_id" }) };

    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(payment_id)}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const payment = await mpResp.json();

    if (!mpResp.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: "No se pudo consultar pago", detail: payment }) };
    }

    const status = payment.status;
    if (status !== "approved") {
      return {
        statusCode: 409,
        body: JSON.stringify({
          status,
          message: "El pago todavía no está aprobado (puede estar pending/in_process)."
        })
      };
    }

    // Validación mínima anti “pago cualquiera”
    const amountOk = Number(payment.transaction_amount) === BOOK_PRICE;
    const currencyOk = String(payment.currency_id || "").toUpperCase() === BOOK_CURRENCY;
    const refOk = String(payment.external_reference || "").startsWith("LIBRO-");

    if (!amountOk || !currencyOk || !refOk) {
      return { statusCode: 403, body: JSON.stringify({ error: "Pago no coincide con el producto." }) };
    }

    // Token firmado, sin DB (expira en 24h)
    const exp = Date.now() + 24 * 60 * 60 * 1000;
    const payload = { payment_id, exp };
    const payloadB64 = b64url(JSON.stringify(payload));
    const sig = sign(payloadB64, DOWNLOAD_SECRET);
    const token = `${payloadB64}.${sig}`;

    const baseUrl = baseUrlFromEvent(event);
    const download_url = `${baseUrl}/api/download?token=${encodeURIComponent(token)}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, download_url })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error validando pago", detail: String(e) }) };
  }
};