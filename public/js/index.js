// public/js/index.js
const $ = (s, el = document) => el.querySelector(s);

$("#year").textContent = new Date().getFullYear();

const btnBuy = $("#btnBuy");
const statusEl = $("#status");
const emailEl = $("#email");

// Este es el chip/píldora donde se ve "ARS $—"
const pricePill = $("#pricePill"); // <- asegurate de tener este id en el HTML

function setStatus(t) {
  statusEl.textContent = t || "";
}

function formatAR(n) {
  try {
    return new Intl.NumberFormat("es-AR").format(Number(n));
  } catch {
    return String(n);
  }
}

async function loadConfig() {
  if (!pricePill) return;

  try {
    const r = await fetch("/api/config", { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) throw new Error("Respuesta no-JSON");

    const data = await r.json();

    const currency = String(data.currency || "ARS").toUpperCase();
    const price = Number(data.price);

    if (!Number.isFinite(price)) throw new Error("Precio inválido");

    pricePill.textContent = `${currency} $${formatAR(price)}`;
  } catch (e) {
    // Esto va a fallar en Live Server (porque no existen functions ahí).
    // En Netlify (o netlify dev) funciona.
    console.warn("No pude cargar config (normal si estás en Live Server):", e);
  }
}

// Intentar cargar precio/título al iniciar
loadConfig();

btnBuy.addEventListener("click", async () => {
  setStatus("");

  const email = (emailEl.value || "").trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    setStatus("Email inválido (o dejalo vacío).");
    return;
  }

  btnBuy.disabled = true;
  setStatus("Creando checkout…");

  try {
    const r = await fetch("/api/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || `Error HTTP ${r.status}`);

    setStatus("Redirigiendo a MercadoPago…");
    window.location.href = data.init_point;
  } catch (e) {
    console.error(e);
    setStatus("No pude crear el pago. Revisá variables de entorno en Netlify.");
    btnBuy.disabled = false;
  }
});