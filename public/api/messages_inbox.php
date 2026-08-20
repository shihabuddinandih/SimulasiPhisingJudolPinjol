<?php
require_once __DIR__ . '/helpers.php';
require_method('GET');

$me = require_login();
$pdo = get_pdo();

// Sengaja hanya select id/text/created_at -- tabel ini memang tidak
// punya kolom pengirim sama sekali, jadi anonim itu dijamin di level
// struktur data, bukan cuma disembunyikan di tampilan.
$stmt = $pdo->prepare(
    'SELECT id, text, created_at FROM messages WHERE to_user_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$me['id']]);

json_response(['messages' => $stmt->fetchAll()]);
