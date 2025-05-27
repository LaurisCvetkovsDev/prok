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

    // Проверка, существует ли уже такой email
    $stmt = $conn->prepare('SELECT id FROM users_app WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered.']);
        exit;
    }
    $stmt->close();

    // Хеширование пароля
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Вставка пользователя
    $stmt = $conn->prepare('INSERT INTO users_app (email, password) VALUES (?, ?)');
    $stmt->bind_param('ss', $email, $passwordHash);
    if ($stmt->execute()) {
        $_SESSION['user_id'] = $stmt->insert_id;
        $_SESSION['email'] = $email;
        echo json_encode(['success' => true, 'user_id' => $stmt->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed.']);
    }
    $stmt->close();
    $conn->close();
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
}