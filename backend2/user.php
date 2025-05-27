<?php
session_start();
if (isset($_SESSION['user_id']) && isset($_SESSION['email'])) {
    echo json_encode([
        'user_id' => $_SESSION['user_id'],
        'email' => $_SESSION['email'],
        'authenticated' => true
    ]);
} else {
    http_response_code(401);
    echo json_encode(['authenticated' => false]);
}