const $ = (s, el = document) => el.querySelector(s);
const title = $("#title");
const subtitle = $("#subtitle");
const pidEl = $("#pid");
const stEl = $("#st");
const msgEl = $("#msg");
const btnRetry = $("#btnRetry");
const btnDownload = $("#btnDownload");

const qp = (k) => new URLSearchParams(location.search).get(k);

function paymentId() {
  // MP puede devolver payment_id o collection_id según el flujo
  return qp("payment_id") || qp("collection_id") || "";
}

function setMsg(t){ msgEl.textContent = t || ""; }

async function validate() {
  const pid = paymentId();
  const status = qp("status") || qp("collection_status") || "";

  pidEl.textContent = pid || "—";
  stEl.textContent = status || "—";
  btnDownload.classList.add("hidden");
  btnRetry.classList.remove("hidden");

  if (!pid) {
    title.textContent = "No encontramos el payment_id";
    subtitle.textContent = "Volvé a intentar desde el botón de compra o contactanos.";
    setMsg("Faltan parámetros de retorno.");
    return;
  }

  title.textContent = "Verificando pago…";
  subtitle.textContent = "Consultando a MercadoPago para validar la acreditación.";
  setMsg("");

  const r = await fetch(`/api/validate?payment_id=${encodeURIComponent(pid)}`);
  const data = await r.json();

  if (!r.ok) {
    title.textContent = "Pago aún no confirmado";
    subtitle.textContent = "Si fue offline/pendiente, puede tardar. Reintentá.";
    setMsg(data?.message || data?.error || "No se pudo verificar.");
    return;
  }

  title.textContent = "Pago aprobado ✅";
  subtitle.textContent = "Ya podés descargar tu libro.";
  stEl.textContent = data.status || "approved";
  btnDownload.href = data.download_url;
  btnDownload.classList.remove("hidden");
  btnRetry.classList.add("hidden");
  setMsg("Listo. Descarga habilitada.");
}

btnRetry.addEventListener("click", validate);
validate();