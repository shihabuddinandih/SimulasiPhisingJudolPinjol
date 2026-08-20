<?php
require_once __DIR__ . '/helpers.php';
require_method('POST');
require_fetch_header();

$me = require_login();
$body = read_json_body();
$id = (int) ($body['id'] ?? 0);

if ($id <= 0) {
    json_error('ID pesan tidak valid.');
}

$pdo = get_pdo();
// WHERE to_user_id = ? memastikan orang hanya bisa hapus pesan yang MASUK ke dirinya sendiri.
$stmt = $pdo->prepare('DELETE FROM messages WHERE id = ? AND to_user_id = ?');
$stmt->execute([$id, $me['id']]);

json_response(['ok' => true, 'deleted' => $stmt->rowCount() > 0]);
