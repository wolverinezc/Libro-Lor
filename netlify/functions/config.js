// netlify/functions/config.js
exports.handler = async () => {
  const title = process.env.BOOK_TITLE || "Mi Libro PDF";
  const price = Number(process.env.BOOK_PRICE || "9900");
  const currency = String(process.env.BOOK_CURRENCY || "ARS").toUpperCase();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ title, price, currency }),
  };
};