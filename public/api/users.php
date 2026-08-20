<?php
require_once __DIR__ . '/helpers.php';
require_method('GET');

$me = require_login();
$pdo = get_pdo();

$stmt = $pdo->prepare(
    'SELECT id, username, name, bio, photo_path, is_admin, created_at
     FROM users WHERE id != ? ORDER BY created_at DESC'
);
$stmt->execute([$me['id']]);

$users = array_map('public_user', $stmt->fetchAll());
json_response(['users' => $users]);
