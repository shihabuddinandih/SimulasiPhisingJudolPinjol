<?php
require_once __DIR__ . '/helpers.php';
require_method('POST');
require_fetch_header();
start_secure_session();

// multipart/form-data karena ada file foto -> pakai $_POST + $_FILES, bukan JSON body.
$username = strtolower(trim($_POST['username'] ?? ''));
$name     = trim($_POST['name'] ?? '');
$password = (string) ($_POST['password'] ?? '');

if (!preg_match(USERNAME_RE, $username)) {
    json_error('Username: 3-20 karakter, huruf kecil/angka/underscore saja.');
}
if ($name === '' || mb_strlen($name) > 60) {
    json_error('Nama tampilan wajib diisi (maks 60 karakter).');
}
if (strlen($password) < 6) {
    json_error('Password minimal 6 karakter.');
}
if (empty($_FILES['photo'])) {
    json_error('Foto profil wajib diunggah.');
}

$pdo = get_pdo();

$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    json_error('Username sudah dipakai, coba yang lain.');
}

$photoName = save_uploaded_photo($_FILES['photo'], $username);
if ($photoName === null) {
    json_error('Foto tidak valid. Gunakan JPG/PNG/WebP maksimal 5MB.');
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$now = time();

try {
    $stmt = $pdo->prepare(
        'INSERT INTO users (username, password_hash, name, bio, photo_path, created_at)
         VALUES (?, ?, ?, \'\', ?, ?)'
    );
    $stmt->execute([$username, $hash, $name, $photoName, $now]);
} catch (PDOException $e) {
    delete_photo_file($photoName);
    if ($e->getCode() === '23000' || str_contains($e->getMessage(), '1062')) {
        json_error('Username sudah dipakai, coba yang lain.');
    }
    json_error('Gagal mendaftar, coba lagi.', 500);
}

$uid = (int) $pdo->lastInsertId();
session_regenerate_id(true);
$_SESSION['uid'] = $uid;

json_response(['ok' => true]);
