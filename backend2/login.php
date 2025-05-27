<?php
session_start();
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required.']);
        exit;
    }

    $stmt = $conn->prepare('SELECT id, password FROM users_app WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password.']);
        exit;
    }
    $stmt->bind_result($user_id, $passwordHash);
    $stmt->fetch();
    if (password_verify($password, $passwordHash)) {
        $_SESSION['user_id'] = $user_id;
        $_SESSION['email'] = $email;
        echo json_encode(['success' => true, 'user_id' => $user_id]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password.']);
    }
    $stmt->close();
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
}