<?php
session_start();
require_once 'db.php';

// Устанавливаем заголовок JSON
header('Content-Type: application/json');

// Проверяем авторизацию
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение всех задач пользователя
    $stmt = $conn->prepare('SELECT * FROM tasks_app WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = [
            'id' => (string) $row['id'],
            'title' => $row['title'],
            'description' => $row['description'] ?: '',
            'completed' => (bool) $row['is_completed'],
            'dueDate' => $row['due_date'],
            'dueTime' => $row['due_time'] ?: '00:00',
            'category_id' => $row['category_id']
        ];
    }

    echo json_encode($tasks);
    $stmt->close();

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Дебаг информация
    error_log("Input: " . $input);
    error_log("Decoded data: " . print_r($data, true));

    if (!$data) {
        // Если JSON не пришел, пробуем $_POST
        $data = $_POST;
        error_log("Using POST data: " . print_r($data, true));
    }

    $action = $data['action'] ?? '';

    if ($action === 'create') {
        // Создание новой задачи
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $due_date = $data['dueDate'] ?? date('Y-m-d');
        $due_time = $data['dueTime'] ?? '00:00';
        $category_id = $data['category_id'] ?? null;

        if (!$title) {
            http_response_code(400);
            echo json_encode(['error' => 'Title is required']);
            exit;
        }

        try {
            // Проверим, есть ли поле due_time в таблице
            $check_stmt = $conn->prepare('DESCRIBE tasks_app');
            $check_stmt->execute();
            $columns = $check_stmt->get_result();
            $has_due_time = false;

            while ($col = $columns->fetch_assoc()) {
                if ($col['Field'] === 'due_time') {
                    $has_due_time = true;
                    break;
                }
            }
            $check_stmt->close();

            if ($has_due_time) {
                $stmt = $conn->prepare('INSERT INTO tasks_app (user_id, title, description, due_date, due_time, category_id) VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->bind_param('issssi', $user_id, $title, $description, $due_date, $due_time, $category_id);
            } else {
                // Если поля due_time нет, создаем без него
                $stmt = $conn->prepare('INSERT INTO tasks_app (user_id, title, description, due_date, category_id) VALUES (?, ?, ?, ?, ?)');
                $stmt->bind_param('isssi', $user_id, $title, $description, $due_date, $category_id);
            }

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
            } else {
                error_log("SQL Error: " . $stmt->error);
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create task: ' . $stmt->error]);
            }
            $stmt->close();
        } catch (Exception $e) {
            error_log("Exception: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }

    } elseif ($action === 'update') {
        // Обновление задачи
        $task_id = $data['id'] ?? '';
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $completed = $data['completed'] ?? false;
        $due_date = $data['dueDate'] ?? '';
        $due_time = $data['dueTime'] ?? '00:00';

        if (!$task_id || !$title) {
            http_response_code(400);
            echo json_encode(['error' => 'ID and title are required']);
            exit;
        }

        try {
            // Проверим, есть ли поле due_time в таблице
            $check_stmt = $conn->prepare('DESCRIBE tasks_app');
            $check_stmt->execute();
            $columns = $check_stmt->get_result();
            $has_due_time = false;

            while ($col = $columns->fetch_assoc()) {
                if ($col['Field'] === 'due_time') {
                    $has_due_time = true;
                    break;
                }
            }
            $check_stmt->close();

            $completed_int = $completed ? 1 : 0;

            if ($has_due_time) {
                $stmt = $conn->prepare('UPDATE tasks_app SET title = ?, description = ?, is_completed = ?, due_date = ?, due_time = ? WHERE id = ? AND user_id = ?');
                $stmt->bind_param('ssissii', $title, $description, $completed_int, $due_date, $due_time, $task_id, $user_id);
            } else {
                $stmt = $conn->prepare('UPDATE tasks_app SET title = ?, description = ?, is_completed = ?, due_date = ? WHERE id = ? AND user_id = ?');
                $stmt->bind_param('ssisii', $title, $description, $completed_int, $due_date, $task_id, $user_id);
            }

            if ($stmt->execute()) {
                echo json_encode(['success' => true]);
            } else {
                error_log("SQL Error: " . $stmt->error);
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update task: ' . $stmt->error]);
            }
            $stmt->close();
        } catch (Exception $e) {
            error_log("Exception: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }

    } elseif ($action === 'delete') {
        // Удаление задачи
        $task_id = $data['id'] ?? '';

        if (!$task_id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID is required']);
            exit;
        }

        try {
            $stmt = $conn->prepare('DELETE FROM tasks_app WHERE id = ? AND user_id = ?');
            $stmt->bind_param('ii', $task_id, $user_id);

            if ($stmt->execute()) {
                echo json_encode(['success' => true]);
            } else {
                error_log("SQL Error: " . $stmt->error);
                http_response_code(500);
                echo json_encode(['error' => 'Failed to delete task: ' . $stmt->error]);
            }
            $stmt->close();
        } catch (Exception $e) {
            error_log("Exception: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

$conn->close();
?>