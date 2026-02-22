const crypto = require("crypto");

function baseUrlFromEvent(event) {
  // Netlify setea URL en prod
  if (process.env.URL) return process.env.URL;
  const proto = event.headers["x-forwarded-proto"] || "http";
  const host = event.headers.host;
  return `${proto}://${host}`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      return { statusCode: 500, body: JSON.stringify({ error: "Falta MP_ACCESS_TOKEN" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").trim();

    const BOOK_TITLE = process.env.BOOK_TITLE || "Mi Libro PDF";
    const BOOK_PRICE = Number(process.env.BOOK_PRICE || "9900");
    const BOOK_CURRENCY = process.env.BOOK_CURRENCY || "ARS";

    const baseUrl = baseUrlFromEvent(event);
    const external_reference = `LIBRO-${crypto.randomUUID()}`;

    const payload = {
      items: [{
        title: BOOK_TITLE,
        quantity: 1,
        unit_price: BOOK_PRICE,
        currency_id: BOOK_CURRENCY
      }],
      external_reference,
      payer: email ? { email } : undefined,
      back_urls: {
        success: `${baseUrl}/gracias.html`,
        pending: `${baseUrl}/gracias.html`,
        failure: `${baseUrl}/gracias.html`
      },
      auto_return: "approved"
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: data?.message || "MP error", detail: data }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_point: data.init_point })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Error creando preferencia", detail: String(e) }) };
  }
};