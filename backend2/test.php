<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

echo json_encode([
    'status' => 'ok',
    'session_user_id' => $_SESSION['user_id'] ?? 'not_logged_in',
    'current_time' => date('Y-m-d H:i:s')
]);

// Проверяем структуру таблицы tasks_app
if (isset($_GET['check_table'])) {
    $stmt = $conn->prepare('DESCRIBE tasks_app');
    $stmt->execute();
    $result = $stmt->get_result();

    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = $row;
    }

    echo json_encode([
        'table_structure' => $columns
    ]);
    $stmt->close();
}

$conn->close();
?>