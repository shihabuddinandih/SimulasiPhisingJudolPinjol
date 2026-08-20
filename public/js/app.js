import { apiJson, apiForm } from "./api.js";
import {
  validateImageFile,
  compressImage,
  escapeHtml,
  formatRelativeTime,
  showError,
  clearError,
  setLoading,
  showToast,
  errorMessage,
} from "./utils.js";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const INBOX_POLL_MS = 25000;

// ---------- Elemen ----------
const navbar = document.getElementById("navbar");
const navAvatar = document.getElementById("navAvatar");
const navName = document.getElementById("navName");
const logoutBtn = document.getElementById("logoutBtn");
const navLinks = document.querySelectorAll(".nav-link[data-view]");

const authView = document.getElementById("authView");
const appViews = {
  home: document.getElementById("homeView"),
  inbox: document.getElementById("inboxView"),
  profile: document.getElementById("profileView"),
};

const tabBtns = document.querySelectorAll(".tab-btn[data-tab]");
const tabPanels = {
  login: document.getElementById("loginForm"),
  register: document.getElementById("registerForm"),
};

const loginForm = document.getElementById("loginForm");
const loginUsernameInput = document.getElementById("loginUsername");
const loginPasswordInput = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const registerForm = document.getElementById("registerForm");
const regUsernameInput = document.getElementById("regUsername");
const regNameInput = document.getElementById("regName");
const regPasswordInput = document.getElementById("regPassword");
const regPhotoInput = document.getElementById("regPhoto");
const regPreview = document.getElementById("regPreview");
const registerError = document.getElementById("registerError");

const userGrid = document.getElementById("userGrid");
const homeEmpty = document.getElementById("homeEmpty");

const messageList = document.getElementById("messageList");
const inboxEmpty = document.getElementById("inboxEmpty");
const inboxBadge = document.getElementById("inboxBadge");

const profileForm = document.getElementById("profileForm");
const profilePhotoInput = document.getElementById("profilePhoto");
const profilePreview = document.getElementById("profilePreview");
const profileNameInput = document.getElementById("profileName");
const profileBioInput = document.getElementById("profileBio");
const profileUsernameEl = document.getElementById("profileUsername");
const profileError = document.getElementById("profileError");
const profileSuccess = document.getElementById("profileSuccess");

const messageModal = document.getElementById("messageModal");
const modalClose = document.getElementById("modalClose");
const modalTargetName = document.getElementById("modalTargetName");
const sendMessageForm = document.getElementById("sendMessageForm");
const messageTextInput = document.getElementById("messageText");
const charCount = document.getElementById("charCount");
const modalError = document.getElementById("modalError");

// ---------- State ----------
let currentUser = null;
let currentTargetUid = null;
let pollTimer = null;

// ---------- Preview foto (dipakai di form daftar & profil) ----------
function wireFilePreview(input, previewEl) {
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      input.value = "";
      previewEl.innerHTML = `<span class="preview-placeholder">📷 Pilih foto</span>`;
      return;
    }
    const url = URL.createObjectURL(file);
    previewEl.innerHTML = `<img src="${url}" alt="Preview" />`;
  });
}
wireFilePreview(regPhotoInput, regPreview);
wireFilePreview(profilePhotoInput, profilePreview);

// ---------- Tab login/daftar ----------
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
    Object.entries(tabPanels).forEach(([key, panel]) => {
      panel.classList.toggle("active", key === btn.dataset.tab);
    });
  });
});

// ---------- Navigasi antar view (home/inbox/profil) ----------
function switchView(name) {
  Object.entries(appViews).forEach(([key, section]) => {
    section.hidden = key !== name;
  });
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === name));

  if (name === "home") loadHome();
  if (name === "inbox") loadInbox();
  if (name === "profile") fillProfileForm();
}
navLinks.forEach((link) => {
  link.addEventListener("click", () => switchView(link.dataset.view));
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(loginError);
  const username = loginUsernameInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value;
  if (!username || !password) {
    showError(loginError, "Isi username dan password.");
    return;
  }
  const submitBtn = loginForm.querySelector("button[type=submit]");
  setLoading(submitBtn, true, "Masuk...");
  try {
    await apiJson("login.php", "POST", { username, password });
    await enterApp();
  } catch (err) {
    console.error(err);
    showError(loginError, errorMessage(err));
  } finally {
    setLoading(submitBtn, false, "Masuk");
  }
});

// ---------- Daftar ----------
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(registerError);

  const username = regUsernameInput.value.trim().toLowerCase();
  const name = regNameInput.value.trim();
  const password = regPasswordInput.value;
  const file = regPhotoInput.files?.[0];

  if (!USERNAME_RE.test(username)) {
    showError(registerError, "Username: 3-20 karakter, huruf kecil/angka/underscore saja.");
    return;
  }
  if (!name) {
    showError(registerError, "Nama tampilan wajib diisi.");
    return;
  }
  if (password.length < 6) {
    showError(registerError, "Password minimal 6 karakter.");
    return;
  }
  const fileErr = validateImageFile(file);
  if (fileErr) {
    showError(registerError, fileErr);
    return;
  }

  const submitBtn = registerForm.querySelector("button[type=submit]");
  setLoading(submitBtn, true, "Mendaftar...");
  try {
    const blob = await compressImage(file);
    const formData = new FormData();
    formData.append("username", username);
    formData.append("name", name);
    formData.append("password", password);
    formData.append("photo", blob, "photo.jpg");

    await apiForm("register.php", formData);

    registerForm.reset();
    regPreview.innerHTML = `<span class="preview-placeholder">📷 Pilih foto</span>`;
    await enterApp();
  } catch (err) {
    console.error(err);
    showError(registerError, errorMessage(err));
  } finally {
    setLoading(submitBtn, false, "Daftar");
  }
});

// ---------- Logout ----------
logoutBtn.addEventListener("click", async () => {
  try {
    await apiJson("logout.php", "POST", {});
  } catch (err) {
    console.error(err);
  }
  exitApp();
});

// ---------- Home: daftar orang & kirim pesan ----------
async function loadHome() {
  try {
    const { users } = await apiJson("users.php");
    userGrid.innerHTML = "";
    users.forEach((u) => {
      const card = document.createElement("div");
      card.className = "user-card";
      card.innerHTML = `
        <img src="${escapeHtml(u.photoUrl)}" alt="${escapeHtml(u.name)}" class="user-photo" loading="lazy" />
        <p class="user-name">${escapeHtml(u.name)}</p>
        <p class="user-username">@${escapeHtml(u.username)}</p>
        ${u.bio ? `<p class="user-bio">${escapeHtml(u.bio)}</p>` : ""}
        <button type="button" class="btn-secondary send-btn" data-uid="${u.id}" data-name="${escapeHtml(u.name)}">💌 Kirim Pesan Admirer</button>
      `;
      userGrid.appendChild(card);
    });
    homeEmpty.hidden = users.length > 0;
  } catch (err) {
    console.error("Gagal memuat daftar user:", err);
  }
}

userGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".send-btn");
  if (!btn) return;
  openMessageModal(Number(btn.dataset.uid), btn.dataset.name);
});

function openMessageModal(uid, name) {
  currentTargetUid = uid;
  modalTargetName.textContent = name;
  messageTextInput.value = "";
  charCount.textContent = "0";
  clearError(modalError);
  messageModal.hidden = false;
  messageTextInput.focus();
}
function closeMessageModal() {
  messageModal.hidden = true;
  currentTargetUid = null;
}
modalClose.addEventListener("click", closeMessageModal);
messageModal.addEventListener("click", (e) => {
  if (e.target === messageModal) closeMessageModal();
});
messageTextInput.addEventListener("input", () => {
  charCount.textContent = String(messageTextInput.value.length);
});

sendMessageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(modalError);
  const text = messageTextInput.value.trim();
  if (!text) {
    showError(modalError, "Tulis pesanmu dulu ya.");
    return;
  }
  if (!currentTargetUid) return;

  const submitBtn = sendMessageForm.querySelector("button[type=submit]");
  setLoading(submitBtn, true, "Mengirim...");
  try {
    await apiJson("messages_send.php", "POST", { toUid: currentTargetUid, text });
    closeMessageModal();
    showToast("Pesan admirer terkirim secara diam-diam! 🤫");
  } catch (err) {
    console.error(err);
    showError(modalError, errorMessage(err));
  } finally {
    setLoading(submitBtn, false, "Kirim Diam-diam 🤫");
  }
});

// ---------- Inbox: pesan masuk ----------
async function loadInbox({ silent = false } = {}) {
  try {
    const { messages } = await apiJson("messages_inbox.php");

    inboxBadge.hidden = messages.length === 0;
    if (messages.length) inboxBadge.textContent = String(messages.length);

    if (silent) return; // dipakai polling badge saja, tanpa render ulang list tiap kali

    messageList.innerHTML = "";
    inboxEmpty.hidden = messages.length > 0;
    messages.forEach((d) => {
      const item = document.createElement("div");
      item.className = "message-item";
      item.innerHTML = `
        <div class="message-meta">
          <span class="message-from">💌 Admirer Rahasia</span>
          <span class="message-time">${formatRelativeTime(d.created_at)}</span>
        </div>
        <p class="message-text">${escapeHtml(d.text)}</p>
        <button type="button" class="btn-ghost delete-msg" data-id="${d.id}">Hapus</button>
      `;
      messageList.appendChild(item);
    });
  } catch (err) {
    console.error("Gagal memuat pesan masuk:", err);
  }
}

messageList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-msg");
  if (!btn) return;
  if (!confirm("Hapus pesan ini?")) return;
  try {
    await apiJson("messages_delete.php", "POST", { id: Number(btn.dataset.id) });
    loadInbox();
  } catch (err) {
    console.error(err);
    showToast("Gagal menghapus pesan.");
  }
});

// ---------- Profil saya ----------
function fillProfileForm() {
  if (!currentUser) return;
  profileNameInput.value = currentUser.name || "";
  profileBioInput.value = currentUser.bio || "";
  profileUsernameEl.textContent = "@" + (currentUser.username || "");
  profilePreview.innerHTML = currentUser.photoUrl
    ? `<img src="${escapeHtml(currentUser.photoUrl)}" alt="Foto profil" />`
    : `<span class="preview-placeholder">📷 Pilih foto</span>`;
}

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(profileError);
  profileSuccess.hidden = true;

  const name = profileNameInput.value.trim();
  const bio = profileBioInput.value.trim();
  const file = profilePhotoInput.files?.[0];

  if (!name) {
    showError(profileError, "Nama tampilan wajib diisi.");
    return;
  }
  if (file) {
    const fileErr = validateImageFile(file);
    if (fileErr) {
      showError(profileError, fileErr);
      return;
    }
  }

  const submitBtn = profileForm.querySelector("button[type=submit]");
  setLoading(submitBtn, true, "Menyimpan...");
  try {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);
    if (file) {
      const blob = await compressImage(file);
      formData.append("photo", blob, "photo.jpg");
    }

    await apiForm("profile_update.php", formData);
    await refreshCurrentUser();

    profilePhotoInput.value = "";
    profileSuccess.textContent = "Profil berhasil disimpan.";
    profileSuccess.hidden = false;
  } catch (err) {
    console.error(err);
    showError(profileError, errorMessage(err));
  } finally {
    setLoading(submitBtn, false, "Simpan");
  }
});

// ---------- Sesi: masuk/keluar app ----------
async function refreshCurrentUser() {
  const { user } = await apiJson("me.php");
  currentUser = user;
  navName.textContent = user.name;
  navAvatar.src = user.photoUrl;
  if (!appViews.profile.hidden) fillProfileForm();
  return user;
}

async function enterApp() {
  await refreshCurrentUser();
  authView.hidden = true;
  navbar.hidden = false;
  switchView("home");
  loadInbox({ silent: true });

  clearInterval(pollTimer);
  pollTimer = setInterval(() => loadInbox({ silent: true }), INBOX_POLL_MS);
}

function exitApp() {
  currentUser = null;
  clearInterval(pollTimer);
  pollTimer = null;

  navbar.hidden = true;
  authView.hidden = false;
  loginForm.reset();
  registerForm.reset();
  regPreview.innerHTML = `<span class="preview-placeholder">📷 Pilih foto</span>`;
  clearError(loginError);
  clearError(registerError);
}

// ---------- Cek sesi saat halaman dibuka ----------
(async function bootstrap() {
  try {
    await enterApp();
  } catch (_) {
    exitApp();
  }
})();
