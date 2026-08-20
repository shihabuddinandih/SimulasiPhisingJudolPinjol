<?php
require_once __DIR__ . '/helpers.php';
require_method('POST');
require_fetch_header();

$me = require_login();

$name = trim($_POST['name'] ?? '');
$bio  = trim($_POST['bio'] ?? '');

if ($name === '' || mb_strlen($name) > 60) {
    json_error('Nama tampilan wajib diisi (maks 60 karakter).');
}
if (mb_strlen($bio) > 200) {
    json_error('Bio maksimal 200 karakter.');
}

$pdo = get_pdo();
$photoName = $me['photo_path'];

if (!empty($_FILES['photo']) && ($_FILES['photo']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $newPhoto = save_uploaded_photo($_FILES['photo'], $me['username']);
    if ($newPhoto === null) {
        json_error('Foto tidak valid. Gunakan JPG/PNG/WebP maksimal 5MB.');
    }
    $oldPhoto = $photoName;
    $photoName = $newPhoto;
    delete_photo_file($oldPhoto);
}

$stmt = $pdo->prepare('UPDATE users SET name = ?, bio = ?, photo_path = ? WHERE id = ?');
$stmt->execute([$name, $bio, $photoName, $me['id']]);

json_response(['ok' => true]);
