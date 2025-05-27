<?php
session_start();
require_once 'db.php';

// Проверяем авторизацию
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение всех записей дневника пользователя
    $stmt = $conn->prepare('SELECT * FROM diary_entries_app WHERE user_id = ? ORDER BY entry_date DESC, created_at DESC');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $entries = [];
    while ($row = $result->fetch_assoc()) {
        // Получаем теги для каждой записи
        $tag_stmt = $conn->prepare('SELECT tag FROM diary_entry_tags_app WHERE diary_entry_id = ?');
        $tag_stmt->bind_param('i', $row['id']);
        $tag_stmt->execute();
        $tag_result = $tag_stmt->get_result();

        $tags = [];
        while ($tag_row = $tag_result->fetch_assoc()) {
            $tags[] = $tag_row['tag'];
        }
        $tag_stmt->close();

        $entries[] = [
            'id' => (string) $row['id'],
            'title' => $row['title'] ?: 'Bez nosaukuma',
            'date' => $row['entry_date'],
            'content' => $row['content'],
            'tags' => $tags,
            'audio_url' => $row['audio_url'],
            'transcription' => $row['transcription'],
            'is_audio_processed' => (bool) $row['is_audio_processed'],
            'created_at' => $row['created_at']
        ];
    }

    echo json_encode($entries);
    $stmt->close();

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        $data = $_POST;
    }

    $action = $data['action'] ?? '';

    if ($action === 'create') {
        // Создание новой записи дневника
        $title = $data['title'] ?? 'Bez nosaukuma';
        $entry_date = $data['date'] ?? date('Y-m-d');
        $content = $data['content'] ?? '';
        $tags = $data['tags'] ?? [];
        $audio_url = $data['audio_url'] ?? null;
        $transcription = $data['transcription'] ?? null;
        $is_audio_processed = isset($data['is_audio_processed']) ? (bool) $data['is_audio_processed'] : false;

        if (!$content && !$title) {
            http_response_code(400);
            echo json_encode(['error' => 'Title or content is required']);
            exit;
        }

        try {
            // Проверим, есть ли новые поля в таблице
            $check_stmt = $conn->prepare('DESCRIBE diary_entries_app');
            $check_stmt->execute();
            $columns = $check_stmt->get_result();
            $has_audio_fields = false;

            while ($col = $columns->fetch_assoc()) {
                if ($col['Field'] === 'audio_url') {
                    $has_audio_fields = true;
                    break;
                }
            }
            $check_stmt->close();

            if ($has_audio_fields) {
                // Создаем запись с аудио полями
                $stmt = $conn->prepare('INSERT INTO diary_entries_app (user_id, entry_date, title, content, audio_url, transcription, is_audio_processed) VALUES (?, ?, ?, ?, ?, ?, ?)');
                $is_audio_processed_int = $is_audio_processed ? 1 : 0;
                $stmt->bind_param('isssssi', $user_id, $entry_date, $title, $content, $audio_url, $transcription, $is_audio_processed_int);
            } else {
                // Создаем запись без аудио полей (для обратной совместимости)
                $stmt = $conn->prepare('INSERT INTO diary_entries_app (user_id, entry_date, content) VALUES (?, ?, ?)');
                $stmt->bind_param('iss', $user_id, $entry_date, $content);
            }

            if ($stmt->execute()) {
                $entry_id = $stmt->insert_id;

                // Добавляем теги
                if (!empty($tags)) {
                    $tag_stmt = $conn->prepare('INSERT INTO diary_entry_tags_app (diary_entry_id, tag) VALUES (?, ?)');
                    foreach ($tags as $tag) {
                        $tag_stmt->bind_param('is', $entry_id, $tag);
                        $tag_stmt->execute();
                    }
                    $tag_stmt->close();
                }

                echo json_encode(['success' => true, 'id' => $entry_id]);
            } else {
                error_log("SQL Error: " . $stmt->error);
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create diary entry: ' . $stmt->error]);
            }
            $stmt->close();
        } catch (Exception $e) {
            error_log("Exception: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }

    } elseif ($action === 'update') {
        // Обновление записи дневника
        $entry_id = $data['id'] ?? '';
        $content = $data['content'] ?? '';
        $tags = $data['tags'] ?? [];

        if (!$entry_id || !$content) {
            http_response_code(400);
            echo json_encode(['error' => 'ID and content are required']);
            exit;
        }

        // Обновляем запись
        $stmt = $conn->prepare('UPDATE diary_entries_app SET content = ? WHERE id = ? AND user_id = ?');
        $stmt->bind_param('sii', $content, $entry_id, $user_id);

        if ($stmt->execute()) {
            // Удаляем старые теги
            $delete_tags_stmt = $conn->prepare('DELETE FROM diary_entry_tags_app WHERE diary_entry_id = ?');
            $delete_tags_stmt->bind_param('i', $entry_id);
            $delete_tags_stmt->execute();
            $delete_tags_stmt->close();

            // Добавляем новые теги
            if (!empty($tags)) {
                $tag_stmt = $conn->prepare('INSERT INTO diary_entry_tags_app (diary_entry_id, tag) VALUES (?, ?)');
                foreach ($tags as $tag) {
                    $tag_stmt->bind_param('is', $entry_id, $tag);
                    $tag_stmt->execute();
                }
                $tag_stmt->close();
            }

            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update diary entry']);
        }
        $stmt->close();

    } elseif ($action === 'delete') {
        // Удаление записи дневника
        $entry_id = $data['id'] ?? '';

        if (!$entry_id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID is required']);
            exit;
        }

        // Удаляем теги
        $delete_tags_stmt = $conn->prepare('DELETE FROM diary_entry_tags_app WHERE diary_entry_id = ?');
        $delete_tags_stmt->bind_param('i', $entry_id);
        $delete_tags_stmt->execute();
        $delete_tags_stmt->close();

        // Удаляем запись
        $stmt = $conn->prepare('DELETE FROM diary_entries_app WHERE id = ? AND user_id = ?');
        $stmt->bind_param('ii', $entry_id, $user_id);

        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete diary entry']);
        }
        $stmt->close();
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

$conn->close();
?>