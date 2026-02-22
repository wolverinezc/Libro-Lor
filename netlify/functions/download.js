const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function verifyToken(token, secret) {
  const [payloadB64, sig] = (token || "").split(".");
  if (!payloadB64 || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (expected !== sig) return null;

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  if (!payload?.payment_id || !payload?.exp) return null;
  if (Date.now() > Number(payload.exp)) return null;

  return payload;
}

exports.handler = async (event) => {
  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET;

    if (!MP_ACCESS_TOKEN) return { statusCode: 500, body: "Falta MP_ACCESS_TOKEN" };
    if (!DOWNLOAD_SECRET) return { statusCode: 500, body: "Falta DOWNLOAD_SECRET" };

    const BOOK_TITLE = process.env.BOOK_TITLE || "Mi Libro PDF";
    const BOOK_PRICE = Number(process.env.BOOK_PRICE || "9900");
    const BOOK_CURRENCY = (process.env.BOOK_CURRENCY || "ARS").toUpperCase();

    const token = (event.queryStringParameters?.token || "").trim();
    const data = verifyToken(token, DOWNLOAD_SECRET);
    if (!data) return { statusCode: 403, body: "Token inválido o expirado." };

    // Re-validar pago en MP (más seguro)
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(data.payment_id)}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const payment = await mpResp.json();
    if (!mpResp.ok) return { statusCode: 400, body: "No se pudo consultar el pago." };

    const ok =
      payment.status === "approved" &&
      Number(payment.transaction_amount) === BOOK_PRICE &&
      String(payment.currency_id || "").toUpperCase() === BOOK_CURRENCY &&
      String(payment.external_reference || "").startsWith("LIBRO-");

    if (!ok) return { statusCode: 403, body: "Pago no válido para descarga." };

    // Leer PDF (ojo: límite ~6MB en functions; si tu PDF es grande, hay que usar storage)
    const filePath = path.join(__dirname, "assets", "libro.pdf");
    if (!fs.existsSync(filePath)) return { statusCode: 500, body: "No encuentro assets/libro.pdf" };

    const pdf = fs.readFileSync(filePath);
    const safeName = BOOK_TITLE.replace(/[^a-z0-9-_ ]/gi, "").trim() || "libro";

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`
      },
      body: pdf.toString("base64")
    };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${String(e)}` };
  }
};
