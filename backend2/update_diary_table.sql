-- Обновление таблицы diary_entries_app для поддержки аудиофайлов
ALTER TABLE diary_entries_app 
ADD COLUMN title VARCHAR(255),
ADD COLUMN audio_url VARCHAR(500),
ADD COLUMN transcription TEXT,
ADD COLUMN is_audio_processed BOOLEAN DEFAULT 0; 