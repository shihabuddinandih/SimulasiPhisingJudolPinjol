<?php
// ============================================================
// SALIN file ini jadi "config.php" (di folder yang sama), lalu isi
// dengan kredensial database dari hPanel -> Databases -> MySQL Databases.
//
// PENTING: "config.php" (bukan yang -example ini) sengaja di-.gitignore
// supaya password database tidak pernah ikut ter-commit ke git/repo publik.
// ============================================================
return [
    'db_host' => 'localhost',
    'db_name' => 'GANTI_DENGAN_NAMA_DATABASE',
    'db_user' => 'GANTI_DENGAN_USER_DATABASE',
    'db_pass' => 'GANTI_DENGAN_PASSWORD_DATABASE',
];
