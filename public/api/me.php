<?php
require_once __DIR__ . '/helpers.php';
require_method('GET');

$user = require_login();
json_response(['user' => public_user($user)]);
