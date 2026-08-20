// ============================================================
// Jembatan tipis ke backend PHP di public/api/*.php.
// Semua endpoint mengembalikan JSON: { ...data } kalau sukses,
// atau { error: "pesan" } dengan status HTTP non-2xx kalau gagal.
// ============================================================

const API_BASE = "api/";

async function handleResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // respons bukan JSON (mis. error 500 dari server) -- tetap ditangani di bawah
  }
  if (!res.ok) {
    throw new Error(data?.error || `Terjadi kesalahan (${res.status}).`);
  }
  return data ?? {};
}

/** GET/POST dengan body JSON. */
export async function apiJson(path, method = "GET", body) {
  const res = await fetch(API_BASE + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch", // dicek server sebagai mitigasi CSRF ringan
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

/** POST multipart/form-data (dipakai saat ada upload foto). */
export async function apiForm(path, formData) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Requested-With": "fetch" },
    body: formData,
  });
  return handleResponse(res);
}
