<?php
// Kumpulan helper yang dipakai di semua endpoint api/*.php.
// Setiap endpoint cukup: require_once __DIR__ . '/helpers.php';

declare(strict_types=1);
date_default_timezone_set('UTC');

require_once __DIR__ . '/db.php';

const USERNAME_RE  = '/^[a-z0-9_]{3,20}$/';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function json_error(string $message, int $status = 400): void {
    json_response(['error' => $message], $status);
}

/** Baca body JSON dari request (dipakai endpoint yang tidak upload file). */
function read_json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function start_secure_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'samesite' => 'Lax',
        'httponly' => true,
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    ]);
    session_start();
}

/**
 * Mitigasi CSRF ringan: browser tidak bisa menambahkan header custom ini
 * lewat pengiriman form HTML biasa dari situs lain, hanya lewat fetch()
 * yang dijalankan dari halaman kita sendiri (same-origin). Wajib dipanggil
 * di semua endpoint yang mengubah data (POST).
 */
function require_fetch_header(): void {
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') {
        json_error('Permintaan ditolak.', 403);
    }
}

function require_method(string $method): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        json_error('Method not allowed.', 405);
    }
}

/** Ambil user yang sedang login dari session, atau hentikan request dengan 401. */
function require_login(): array {
    start_secure_session();
    if (empty($_SESSION['uid'])) {
        json_error('Belum login.', 401);
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare('SELECT id, username, name, bio, photo_path, is_admin, created_at FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['uid']]);
    $user = $stmt->fetch();
    if (!$user) {
        json_error('Sesi tidak valid, silakan login lagi.', 401);
    }
    return $user;
}

/** Bentuk data user yang aman dikirim ke client (tanpa password_hash). */
function public_user(array $row): array {
    return [
        'id'        => (int) $row['id'],
        'username'  => $row['username'],
        'name'      => $row['name'],
        'bio'       => $row['bio'],
        'photoUrl'  => $row['photo_path'] !== '' ? 'uploads/photos/' . $row['photo_path'] : '',
        'isAdmin'   => (bool) $row['is_admin'],
        'createdAt' => (int) $row['created_at'],
    ];
}

/**
 * Validasi & simpan file foto yang diupload ($_FILES['photo']).
 * Return nama file yang tersimpan di uploads/photos/, atau null kalau tidak valid.
 */
function save_uploaded_photo(array $file, string $baseName): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return null;
    if ($file['size'] > MAX_PHOTO_BYTES) return null;

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!isset($allowed[$mime])) return null;

    $dir = __DIR__ . '/../uploads/photos';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $safeBase = preg_replace('/[^a-z0-9_]/', '', strtolower($baseName));
    $fileName = $safeBase . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
    $dest = $dir . '/' . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $dest)) return null;
    return $fileName;
}

function delete_photo_file(string $fileName): void {
    if ($fileName === '') return;
    $path = __DIR__ . '/../uploads/photos/' . $fileName;
    if (is_file($path)) @unlink($path);
}
