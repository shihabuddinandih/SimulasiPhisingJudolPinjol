<?php
// Endpoint khusus admin: lihat pasangan pengirim <-> penerima untuk keperluan
// moderasi (mis. ada laporan pesan berisi konten tidak pantas). Jadikan
// dirimu admin lewat phpMyAdmin: UPDATE users SET is_admin = 1 WHERE username = '...';
require_once __DIR__ . '/helpers.php';
require_method('GET');

$me = require_login();
if (!$me['is_admin']) {
    json_error('Khusus admin.', 403);
}

$pdo = get_pdo();
$stmt = $pdo->query(
    'SELECT ms.message_id, ms.created_at,
            fu.username AS from_username, fu.name AS from_name,
            tu.username AS to_username, tu.name AS to_name,
            m.text
     FROM message_senders ms
     JOIN users fu ON fu.id = ms.from_user_id
     JOIN users tu ON tu.id = ms.to_user_id
     JOIN messages m ON m.id = ms.message_id
     ORDER BY ms.created_at DESC
     LIMIT 200'
);

json_response(['items' => $stmt->fetchAll()]);
