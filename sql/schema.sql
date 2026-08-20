-- ============================================================
-- Skema database Secret Admirer.
-- Jalankan SEKALI lewat phpMyAdmin (hPanel -> Databases -> phpMyAdmin)
-- di database yang sudah kamu buat, tab "SQL" -> tempel semua isi file
-- ini -> Go.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(20)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(60)  NOT NULL,
  bio           VARCHAR(200) NOT NULL DEFAULT '',
  photo_path    VARCHAR(255) NOT NULL DEFAULT '',
  is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  to_user_id   INT UNSIGNED NOT NULL,
  text         VARCHAR(500) NOT NULL,
  created_at   INT UNSIGNED NOT NULL,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_to (to_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Identitas pengirim disimpan TERPISAH dari pesan yang dilihat penerima.
-- Tidak ada endpoint publik yang membaca tabel ini kecuali akun admin
-- (lihat api/admin_senders.php) -- ini yang menjaga anonimitas pengirim.
CREATE TABLE IF NOT EXISTS message_senders (
  message_id   INT UNSIGNED PRIMARY KEY,
  from_user_id INT UNSIGNED NOT NULL,
  to_user_id   INT UNSIGNED NOT NULL,
  created_at   INT UNSIGNED NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_senders_from (from_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Setelah tabel dibuat dan kamu sudah daftar akun pertamamu lewat website,
-- jadikan dirimu admin dengan menjalankan (ganti 'username_kamu'):
--
--   UPDATE users SET is_admin = 1 WHERE username = 'username_kamu';
