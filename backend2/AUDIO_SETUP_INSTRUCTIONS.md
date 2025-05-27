# Audio Diary Setup Instructions

## Database Update Required

To enable audio diary functionality, you need to update the `diary_entries_app` table by running the following SQL command in your MySQL database:

```sql
ALTER TABLE diary_entries_app
ADD COLUMN title VARCHAR(255),
ADD COLUMN audio_url VARCHAR(500),
ADD COLUMN transcription TEXT,
ADD COLUMN is_audio_processed BOOLEAN DEFAULT 0;
```

## How to run this SQL update:

### Method 1: Using phpMyAdmin (Recommended)

1. Login to your hosting control panel (dreamhosters.com)
2. Go to phpMyAdmin
3. Select your database `planner_app`
4. Click on the "SQL" tab
5. Copy and paste the SQL command above
6. Click "Go" to execute

### Method 2: Using MySQL command line

If you have command line access:

```bash
mysql -u your_username -p planner_app < update_diary_table.sql
```

## File Structure Created

The following directories have been created for audio file storage:

```
backend2/
├── uploads/
│   └── audio/
│       └── [user_id folders will be created automatically]
```

## Features Enabled

After running the SQL update, the following features will be available:

1. **Audio Recording**: Users can record audio directly in the app
2. **Audio Upload**: Audio files are uploaded to the server and stored securely
3. **Transcription Support**: Audio can be transcribed to text (when transcription service is integrated)
4. **Audio Playback**: Users can play back their recorded audio
5. **Mixed Content**: Diary entries can contain both text and audio
6. **Database Persistence**: All audio data is stored in the database and linked to user accounts

## Security Features

- Audio files are stored in user-specific folders (`uploads/audio/{user_id}/`)
- Only authenticated users can upload audio
- File type validation (only audio files allowed)
- File size limits (10MB max per file)
- Session-based authentication for all operations

## API Endpoints Used

- `POST /upload_audio.php` - Upload audio files
- `GET /diary.php` - Get all diary entries (including audio entries)
- `POST /diary.php` - Create/update/delete diary entries with audio support

## Frontend Changes

The `AudioDiaryScreen` component has been updated to:

- Use database API instead of local storage
- Handle audio file uploads
- Support mixed text/audio entries
- Maintain backward compatibility with text-only entries
