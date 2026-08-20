<?php
require_once __DIR__ . '/helpers.php';
require_method('POST');
require_fetch_header();

$me = require_login();
$body = read_json_body();

$toUid = (int) ($body['toUid'] ?? 0);
$text  = trim((string) ($body['text'] ?? ''));

if ($toUid <= 0 || $toUid === (int) $me['id']) {
    json_error('Penerima tidak valid.');
}
if ($text === '' || mb_strlen($text) > 500) {
    json_error('Pesan wajib diisi (maks 500 karakter).');
}

$pdo = get_pdo();

$stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$toUid]);
if (!$stmt->fetch()) {
    json_error('Penerima tidak ditemukan.', 404);
}

$now = time();

// Dua tabel ditulis dalam satu transaksi: "messages" (dibaca penerima, TANPA
// identitas pengirim) dan "message_senders" (identitas pengirim, hanya
// dibaca lewat admin_senders.php) -- supaya pesan benar-benar anonim
// bagi penerima.
$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('INSERT INTO messages (to_user_id, text, created_at) VALUES (?, ?, ?)');
    $stmt->execute([$toUid, $text, $now]);
    $messageId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO message_senders (message_id, from_user_id, to_user_id, created_at) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$messageId, $me['id'], $toUid, $now]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    json_error('Gagal mengirim pesan, coba lagi.', 500);
}

json_response(['ok' => true]);
