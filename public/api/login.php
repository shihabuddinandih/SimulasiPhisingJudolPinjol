<?php
require_once __DIR__ . '/helpers.php';
require_method('POST');
require_fetch_header();
start_secure_session();

$body = read_json_body();
$username = strtolower(trim($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($username === '' || $password === '') {
    json_error('Isi username dan password.');
}

$pdo = get_pdo();
$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    json_error('Username atau password salah.', 401);
}

session_regenerate_id(true);
$_SESSION['uid'] = (int) $user['id'];

json_response(['ok' => true]);
