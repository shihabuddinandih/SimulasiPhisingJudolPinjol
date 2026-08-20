# Secret Admirer 💌

Website sederhana untuk kirim & terima "pesan admirer" secara anonim. User
daftar dengan **username & password sendiri**, isi nama tampilan + foto
profil, lalu bisa saling mengirim pesan rahasia lewat halaman Home — pesan
yang diterima tidak menampilkan siapa pengirimnya.

Dibangun dengan **PHP + MySQL** di backend dan HTML/CSS/JS murni (tanpa build
tool) di frontend — cocok untuk **Shared/Business Hosting Hostinger** (tidak
butuh Node.js, VPS, atau akses root).

## Struktur folder

```
public/                    <- upload ISI folder ini ke public_html di Hostinger
  index.html
  css/style.css
  js/api.js                 <- jembatan fetch() ke backend PHP
  js/utils.js
  js/app.js
  api/
    config.example.php      <- salin jadi config.php, isi kredensial DB
    config.php               <- (dibuat lokal, JANGAN di-commit -- lihat .gitignore)
    db.php
    helpers.php
    register.php
    login.php
    logout.php
    me.php
    users.php
    profile_update.php
    messages_send.php
    messages_inbox.php
    messages_delete.php
    admin_senders.php
    .htaccess
  uploads/
    photos/                 <- foto profil hasil upload disimpan di sini
      .htaccess
sql/
  schema.sql                <- jalankan sekali lewat phpMyAdmin
```

## Langkah setup

### 1. Siapkan hosting
Pastikan paket Hostinger-mu **Shared Hosting / Business Hosting** (bukan
khusus VPS) — paket ini sudah termasuk PHP dan MySQL lewat **hPanel**.

### 2. Buat database MySQL
1. Buka **hPanel → Databases → MySQL Databases**.
2. Buat database baru + user baru (atau pakai yang dibuatkan otomatis), catat:
   nama database, username database, password, dan host (biasanya `localhost`).

### 3. Import skema tabel
1. Dari hPanel, buka **phpMyAdmin** untuk database yang baru dibuat.
2. Buka tab **SQL**, tempel seluruh isi [sql/schema.sql](sql/schema.sql), klik **Go**.
3. Pastikan 3 tabel muncul: `users`, `messages`, `message_senders`.

### 4. Isi kredensial database
Salin [public/api/config.example.php](public/api/config.example.php) menjadi
`public/api/config.php` (kalau belum ada), lalu isi dengan kredensial dari
langkah 2:
```php
return [
    'db_host' => 'localhost',
    'db_name' => 'namadb_mu',
    'db_user' => 'userdb_mu',
    'db_pass' => 'password_db_mu',
];
```

### 5. Upload ke Hostinger
Lewat **hPanel → File Manager** (atau FTP/FileZilla), upload **seluruh isi**
folder `public/` (bukan folder `public/`-nya sendiri) ke `public_html/` di
hosting-mu, termasuk file yang diawali titik seperti `.htaccess` (aktifkan
"Show hidden files" di File Manager kalau tidak terlihat).

### 6. Cek permission folder upload
Folder `public_html/uploads/photos/` harus bisa ditulis oleh PHP — biasanya
permission default Hostinger (755) sudah cukup. Kalau upload foto gagal
terus, coba ubah permission folder itu ke `755` atau `775` lewat File
Manager (klik kanan folder → Permissions).

### 7. Coba buka website
Buka domainmu, coba **Daftar** akun pertama lengkap dengan foto profil. Kalau
berhasil masuk ke halaman Home, semuanya sudah tersambung dengan benar.

### 8. Jadikan dirimu admin (opsional, disarankan)
Supaya bisa melihat siapa pengirim tiap pesan admirer untuk keperluan
moderasi:
1. Buka **phpMyAdmin**, pilih database project ini, tab **SQL**.
2. Jalankan (ganti dengan username yang tadi kamu daftarkan):
   ```sql
   UPDATE users SET is_admin = 1 WHERE username = 'username_kamu';
   ```
3. Data pengirim ↔ penerima sekarang bisa diambil lewat
   `GET /api/admin_senders.php` saat login sebagai akun ini (belum ada
   halaman UI untuk ini — datanya JSON mentah, cukup untuk moderasi manual).

## Cara kerja singkat

- **Daftar**: `POST api/register.php` (multipart/form-data) — validasi
  username (huruf kecil/angka/underscore, 3-20 karakter, harus unik),
  password di-hash dengan `password_hash()` (bcrypt), foto dikompres di
  browser (resize max 600px, JPEG) sebelum diupload lalu divalidasi ulang
  tipe filenya di server sebelum disimpan ke `uploads/photos/`.
- **Login**: `POST api/login.php` — sesi disimpan lewat PHP session
  (cookie `httpOnly`, `SameSite=Lax`).
- **Home**: `GET api/users.php` — daftar semua user selain diri sendiri,
  dimuat ulang tiap kali tab Home dibuka.
- **Kirim pesan**: `POST api/messages_send.php` — menulis ke dua tabel
  sekaligus dalam satu transaksi database:
  - `messages` — isi pesan + `to_user_id`, **tanpa** identitas pengirim.
    Ini yang dibaca penerima.
  - `message_senders` — `from_user_id` + `to_user_id`, hanya bisa diambil
    lewat `admin_senders.php` (khusus akun `is_admin = 1`).
- **Pesan Masuk**: `GET api/messages_inbox.php`, dipoll otomatis tiap 25
  detik untuk update badge jumlah pesan. Pesan tampil sebagai
  "💌 Admirer Rahasia" tanpa nama pengirim; penerima bisa menghapusnya
  (`POST api/messages_delete.php`).
- **Profil Saya**: `POST api/profile_update.php` — ubah nama, bio, dan foto
  kapan saja (username tidak bisa diubah).

## Keamanan & privasi (penting dibaca)

- **Password** disimpan sebagai hash bcrypt (`password_hash`/`password_verify`),
  tidak pernah sebagai teks biasa.
- **SQL injection**: semua query pakai prepared statement (PDO), tidak ada
  string SQL yang digabung manual dari input user.
- **Anonimitas pengirim dijaga secara struktural**: tabel `messages` yang
  dibaca penerima **tidak punya kolom pengirim sama sekali** — bukan cuma
  disembunyikan di tampilan. Identitas pengirim ada di tabel terpisah
  (`message_senders`) yang hanya bisa diakses lewat endpoint berpagar
  `is_admin`.
- **Upload foto**: divalidasi tipe file lewat `finfo` (bukan cuma ekstensi),
  dibatasi 5MB, nama file di-generate ulang oleh server (bukan nama asli dari
  user), dan folder `uploads/photos/` mematikan eksekusi PHP lewat
  `.htaccess` — kalaupun ada file berbahaya yang lolos, tidak akan pernah
  dieksekusi.
- **CSRF**: endpoint yang mengubah data mewajibkan header
  `X-Requested-With: fetch`, yang tidak bisa ditambahkan lewat pengiriman
  form HTML biasa dari situs lain, ditambah cookie sesi `SameSite=Lax`.
- **`api/config.php`** (berisi password database asli) di-`.gitignore` dan
  diblokir aksesnya langsung lewat HTTP oleh `.htaccess` — jangan pernah
  commit atau upload isinya ke tempat publik.

Hal lain yang **disarankan** untuk menambah proteksi lebih lanjut (belum
termasuk di scaffold ini):
- **Rate limiting** pengiriman pesan (mis. maks N pesan/menit per user) —
  bisa ditambah dengan kolom penghitung sederhana di tabel `users` atau
  tabel log terpisah.
- Halaman **lupa password** — saat ini kalau lupa, satu-satunya cara reset
  adalah admin mengubah `password_hash` user itu manual lewat phpMyAdmin
  (`UPDATE users SET password_hash = '...' WHERE username = '...'`, isi
  dengan hasil `password_hash()` yang baru).
- Fitur **report/block** pengirim untuk penyalahgunaan (mudah ditambahkan
  karena identitas pengirim sudah tercatat di `message_senders`).
- **HTTPS**: pastikan aktifkan SSL gratis Hostinger (hPanel → SSL) supaya
  password & sesi tidak dikirim polos lewat jaringan.

## Kenapa bukan Firebase?

Versi sebelumnya project ini memakai Firebase (Auth + Firestore + Storage +
Hosting). Diganti ke PHP + MySQL karena Firebase **Storage** kini mewajibkan
paket berbayar (Blaze) untuk diaktifkan, sementara target hosting project ini
adalah paket Hostinger yang sudah dimiliki/direncanakan. Backend PHP + MySQL
di atas mereplikasi seluruh perilaku dan aturan keamanan versi Firebase
tadi (termasuk desain anonimitas pengirim pesan), hanya beda "mesin" di
belakang layar.
