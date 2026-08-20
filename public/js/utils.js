// ============================================================
// Kumpulan helper kecil yang dipakai di beberapa tempat (app.js).
// ============================================================

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB, sinkron dengan storage.rules

/** Validasi cepat file gambar sebelum diproses. Return pesan error, atau null kalau valid. */
export function validateImageFile(file) {
  if (!file) return "Pilih foto terlebih dahulu.";
  if (!file.type.startsWith("image/")) return "File yang dipilih harus berupa gambar.";
  if (file.size > MAX_FILE_BYTES) return "Ukuran foto maksimal 5MB.";
  return null;
}

/** Kompres & resize gambar (max dimensi 600px, JPEG) sebelum diupload, supaya hemat kuota. */
export function compressImage(file, maxDimension = 600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("Gagal memproses gambar."));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar."));
    };
    img.src = url;
  });
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/** Format unix timestamp (detik, dari kolom created_at MySQL) jadi teks relatif ("5 menit lalu"). */
export function formatRelativeTime(unixSeconds) {
  if (!unixSeconds) return "Baru saja";
  const date = new Date(unixSeconds * 1000);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

export function clearError(el) {
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

/** Toggle state loading pada tombol submit yang punya struktur <span class="btn-text"> + <span class="btn-spinner">. */
export function setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  if (text && label) text.textContent = label;
  if (spinner) spinner.hidden = !loading;
}

let toastTimer = null;
export function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

/** Pesan error yang enak dibaca dari Error biasa maupun ApiError (lihat api.js). */
export function errorMessage(err) {
  if (err?.name === "TypeError") return "Koneksi ke server bermasalah. Periksa internet-mu.";
  return err?.message || "Terjadi kesalahan, coba lagi.";
}
