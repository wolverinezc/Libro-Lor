const $ = (s, el = document) => el.querySelector(s);

$("#year").textContent = new Date().getFullYear();

const btnBuy = $("#btnBuy");
const statusEl = $("#status");
const emailEl = $("#email");

function setStatus(t) { statusEl.textContent = t || ""; }

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

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Error");

    setStatus("Redirigiendo a MercadoPago…");
    window.location.href = data.init_point;
  } catch (e) {
    console.error(e);
    setStatus("No pude crear el pago. Revisá variables de entorno en Netlify.");
    btnBuy.disabled = false;
  }
});