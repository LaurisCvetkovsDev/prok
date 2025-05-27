<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

// Проверяем авторизацию
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Проверяем, что файл загружен
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No audio file uploaded or upload error']);
        exit;
    }

    $uploadedFile = $_FILES['audio'];
    $fileName = $uploadedFile['name'];
    $fileTmpPath = $uploadedFile['tmp_name'];
    $fileSize = $uploadedFile['size'];
    $fileType = $uploadedFile['type'];

    // Проверяем тип файла (разрешаем только аудио файлы)
    $allowedMimeTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg'];
    if (!in_array($fileType, $allowedMimeTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Only audio files are allowed.']);
        exit;
    }

    // Проверяем размер файла (максимум 10MB)
    $maxFileSize = 10 * 1024 * 1024; // 10MB
    if ($fileSize > $maxFileSize) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large. Maximum size is 10MB.']);
        exit;
    }

    // Создаем папку для аудиофайлов пользователя, если её нет
    $uploadsDir = __DIR__ . '/uploads/audio/' . $user_id;
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    // Генерируем уникальное имя файла
    $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
    $uniqueFileName = uniqid('audio_', true) . '.' . $fileExtension;
    $destinationPath = $uploadsDir . '/' . $uniqueFileName;

    // Перемещаем файл в папку загрузок
    if (move_uploaded_file($fileTmpPath, $destinationPath)) {
        // Создаем URL для доступа к файлу
        $audioUrl = '/backend2/uploads/audio/' . $user_id . '/' . $uniqueFileName;

        echo json_encode([
            'success' => true,
            'audio_url' => $audioUrl,
            'file_name' => $uniqueFileName,
            'file_size' => $fileSize
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save audio file']);
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

$conn->close();
?>