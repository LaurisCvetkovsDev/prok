export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: Date;
  dueTime: string;
  description?: string;
  diaryEntryId?: string; // Связь с записью дневника
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  audioUri?: string; // Путь к аудио файлу
  transcription?: string; // Текст из аудио
  text: string; // Ручной текст или отредактированный
  date: Date;
  categoryId?: string;
  taskId?: string; // Связь с заданием из планировщика
  isAudioProcessed: boolean; // Обработан ли аудио файл
  tags: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  isAuthenticated: boolean;
} 